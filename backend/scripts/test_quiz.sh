#!/usr/bin/env bash
set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
PASSWORD="password123"
PASSED=0
FAILED=0
STATUS=""
BODY=""

##########################################################
#                       HELPERS
##########################################################
request() {
    local method=$1 path=$2 token=$3 data=${4:-}
    local args=(-s -X "$method" "$BASE_URL$path" -w $'\n%{http_code}')
    [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
    [[ -n "$data" ]] && args+=(-H "Content-Type: application/json" -d "$data")
    local output
    output=$(curl "${args[@]}")
    STATUS=${output##*$'\n'}
    BODY=${output%$'\n'*}
}

json_get() {
    python3 -c 'import sys, json
data = json.loads(sys.argv[1])
for key in sys.argv[2:]:
    data = data[int(key)] if isinstance(data, list) else data[key]
print("null" if data is None else data)' "$BODY" "$@" 2>/dev/null
}

check_status() {
    local name=$1 expected=$2
    if [[ "$STATUS" == "$expected" ]]; then
        echo "PASS  $name (expected $expected, got $STATUS)"
        PASSED=$((PASSED + 1))
    else
        echo "FAIL  $name (expected $expected, got $STATUS)"
        echo "      body: $BODY"
        FAILED=$((FAILED + 1))
    fi
}

check_status_in() {
    local name=$1 expected1=$2 expected2=$3
    if [[ "$STATUS" == "$expected1" || "$STATUS" == "$expected2" ]]; then
        echo "PASS  $name (expected $expected1 or $expected2, got $STATUS)"
        PASSED=$((PASSED + 1))
    else
        echo "FAIL  $name (expected $expected1 or $expected2, got $STATUS)"
        echo "      body: $BODY"
        FAILED=$((FAILED + 1))
    fi
}

check_value() {
    local name=$1 expected=$2 actual=$3
    if [[ "$actual" == "$expected" ]]; then
        echo "PASS  $name (expected '$expected', got '$actual')"
        PASSED=$((PASSED + 1))
    else
        echo "FAIL  $name (expected '$expected', got '$actual')"
        echo "      body: $BODY"
        FAILED=$((FAILED + 1))
    fi
}

check_true() {
    local name=$1 condition=$2
    if [[ "$condition" == "yes" ]]; then
        echo "PASS  $name"
        PASSED=$((PASSED + 1))
    else
        echo "FAIL  $name"
        echo "      body: $BODY"
        FAILED=$((FAILED + 1))
    fi
}

question_count() {
    python3 -c 'import sys, json; print(len(json.loads(sys.argv[1])["questions"]))' "$BODY" 2>/dev/null
}

question_card_ids() {
    python3 -c 'import sys, json
print(" ".join(q["card_id"] for q in json.loads(sys.argv[1])["questions"]))' "$BODY" 2>/dev/null
}

all_questions_valid() {
    python3 -c 'import sys, json
questions = json.loads(sys.argv[1])["questions"]
ok = all(
    len(q["options"]) == 4
    and sum(o["is_correct"] for o in q["options"]) == 1
    and len({o["text"] for o in q["options"]}) == 4
    for q in questions
)
print("yes" if ok and questions else "no")' "$BODY" 2>/dev/null
}

correct_text() {
    python3 -c 'import sys, json
for q in json.loads(sys.argv[1])["questions"]:
    if q["card_id"] == sys.argv[2]:
        print(next(o["text"] for o in q["options"] if o["is_correct"]))' "$1" "$2" 2>/dev/null
}

create_cards() {
    local deck_id=$1
    shift
    for back in "$@"; do
        request POST "/decks/$deck_id/cards" "$TOKEN" '{"front": "Question for '"$back"'?", "back": "'"$back"'"}'
        [[ "$STATUS" == "201" ]] || echo "      create card '$back' failed: $STATUS $BODY"
    done
}

##########################################################
#                       SETUP
##########################################################
echo "== Setup"
request POST /auth/register "" '{"email": "alice@example.com", "password": "'$PASSWORD'"}'
check_status_in "register alice" 201 409

request POST /auth/login "" '{"email": "alice@example.com", "password": "'$PASSWORD'"}'
check_status "login alice" 200
TOKEN=$(json_get access_token)

request POST /auth/register "" '{"email": "bob@example.com", "password": "'$PASSWORD'"}'
check_status_in "register bob" 201 409

request POST /auth/login "" '{"email": "bob@example.com", "password": "'$PASSWORD'"}'
check_status "login bob" 200
TOKEN2=$(json_get access_token)

request POST /decks "$TOKEN" '{"name": "Quiz small"}'
check_status "alice creates a 3-card deck" 201
SMALL_DECK_ID=$(json_get id)
create_cards "$SMALL_DECK_ID" Paris Madrid Rome

request POST /decks "$TOKEN" '{"name": "Quiz"}'
check_status "alice creates a 5-card deck" 201
DECK_ID=$(json_get id)
create_cards "$DECK_ID" Paris Madrid Rome Berlin Lisbon

request POST /decks "$TOKEN" '{"name": "Quiz duplicates"}'
check_status "alice creates a deck with duplicate backs" 201
DUP_DECK_ID=$(json_get id)
create_cards "$DUP_DECK_ID" Paris Paris Madrid Madrid Rome

##########################################################
#                     NOT ENOUGH CARDS
##########################################################
echo "== Not enough cards"
request GET "/decks/$SMALL_DECK_ID/quiz" "$TOKEN"
check_status "quiz on a 3-card deck" 422
check_value "detail message" "A quiz needs at least 4 cards with different answers" "$(json_get detail)"

request GET "/decks/$DUP_DECK_ID/quiz" "$TOKEN"
check_status "quiz on 5 cards with only 3 distinct backs" 422

##########################################################
#                         QUIZ
##########################################################
echo "== Quiz"
request GET "/decks/$DECK_ID/quiz" "$TOKEN"
check_status "quiz on a 5-card deck" 200
check_value "deck_id matches" "$DECK_ID" "$(json_get deck_id)"
check_value "default count gives all 5 cards" "5" "$(question_count)"

request GET "/decks/$DECK_ID/quiz?count=3" "$TOKEN"
check_status "quiz with count=3" 200
check_value "count=3 gives 3 questions" "3" "$(question_count)"
check_true "4 options, exactly one correct, all texts distinct" "$(all_questions_valid)"

QUIZ_BODY=$BODY
for CARD_ID in $(question_card_ids); do
    EXPECTED=$(correct_text "$QUIZ_BODY" "$CARD_ID")
    request GET "/cards/$CARD_ID" "$TOKEN"
    check_value "correct option is the back of card ${CARD_ID:0:8}" "$(json_get back)" "$EXPECTED"
done
BODY=$QUIZ_BODY
check_value "prompt is the card's front" "Question for $(correct_text "$QUIZ_BODY" "$(json_get questions 0 card_id)")?" "$(json_get questions 0 prompt)"

##########################################################
#                      VALIDATION
##########################################################
echo "== Validation"
request GET "/decks/$DECK_ID/quiz?count=0" "$TOKEN"
check_status "count=0" 422

request GET "/decks/$DECK_ID/quiz?count=51" "$TOKEN"
check_status "count=51" 422

request GET "/decks/$DECK_ID/quiz" ""
check_status "quiz without token" 401

##########################################################
#                       DUE FIRST
##########################################################
echo "== Due first"
request GET "/decks/$DECK_ID/due?limit=1" "$TOKEN"
REVIEWED_ID=$(json_get 0 id)

request POST "/cards/$REVIEWED_ID/reviews" "$TOKEN" '{"rating": 4}'
check_status "review one card with rating 4" 201

request GET "/decks/$DECK_ID/quiz?count=4" "$TOKEN"
check_status "quiz with count=4" 200
check_value "count=4 gives 4 questions" "4" "$(question_count)"
check_true "reviewed card is not in the quiz" "$([[ " $(question_card_ids) " != *" $REVIEWED_ID "* ]] && echo yes || echo no)"

request GET "/decks/$DECK_ID/quiz?count=5" "$TOKEN"
check_value "count=5 fills with the not-due card" "$REVIEWED_ID" "$(json_get questions 4 card_id)"

##########################################################
#                      OWNERSHIP
##########################################################
echo "== Ownership"
request GET "/decks/$DECK_ID/quiz" "$TOKEN2"
check_status "bob gets alice's quiz" 404
check_value "detail is 'Deck not found'" "Deck not found" "$(json_get detail)"

request GET /decks/00000000-0000-4000-8000-000000000000/quiz "$TOKEN"
check_status "quiz for random-uuid deck" 404

request DELETE "/decks/$DECK_ID" "$TOKEN"
check_status "alice deletes the deck" 204

request GET "/decks/$DECK_ID/quiz" "$TOKEN"
check_status "quiz on soft-deleted deck" 404

##########################################################
#                       SUMMARY
##########################################################
echo
echo "$PASSED passed, $FAILED failed"
[[ $FAILED -eq 0 ]]
