#!/usr/bin/env bash
set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
COMPOSE_FILE="$(dirname "$0")/../docker-compose.yml"
PASSWORD="password123"
RUN_ID=$(date +%s)
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

check_stats() {
    local label=$1 due=$2 today=$3 streak=$4 accuracy=$5
    request GET /stats "$TOKEN"
    check_status "$label: GET /stats" 200
    check_value "$label: cards_due" "$due" "$(json_get cards_due)"
    check_value "$label: reviews_today" "$today" "$(json_get reviews_today)"
    check_value "$label: streak_days" "$streak" "$(json_get streak_days)"
    check_value "$label: accuracy_30d" "$accuracy" "$(json_get accuracy_30d)"
}

register_and_login() {
    local email=$1
    request POST /auth/register "" '{"email": "'"$email"'", "password": "'$PASSWORD'"}'
    check_status "register $email" 201
    request POST /auth/login "" '{"email": "'"$email"'", "password": "'$PASSWORD'"}'
    check_status "login $email" 200
}

create_card() {
    local token=$1 deck_id=$2 back=$3
    request POST "/decks/$deck_id/cards" "$token" '{"front": "Question for '"$back"'?", "back": "'"$back"'"}'
    [[ "$STATUS" == "201" ]] || echo "      create card '$back' failed: $STATUS $BODY"
}

psql_exec() {
    docker compose -f "$COMPOSE_FILE" exec -T db psql -U DeenDoston -d study_app -v ON_ERROR_STOP=1 -q -c "$1"
}

##########################################################
#                       NEW USER
##########################################################
echo "== New user"
register_and_login "stats_$RUN_ID@example.com"
TOKEN=$(json_get access_token)

request GET /auth/me "$TOKEN"
USER_ID=$(json_get id)

check_stats "new user" 0 0 0 null

##########################################################
#                       CARDS DUE
##########################################################
echo "== Cards due"
request POST /decks "$TOKEN" '{"name": "Stats"}'
check_status "create deck" 201
DECK_ID=$(json_get id)
create_card "$TOKEN" "$DECK_ID" Paris
create_card "$TOKEN" "$DECK_ID" Madrid
create_card "$TOKEN" "$DECK_ID" Rome

request GET /stats "$TOKEN"
check_value "3 new cards are due" "3" "$(json_get cards_due)"

##########################################################
#                        REVIEWS
##########################################################
echo "== Reviews"
request GET "/decks/$DECK_ID/due?limit=2" "$TOKEN"
CARD1=$(json_get 0 id)
CARD2=$(json_get 1 id)

request POST "/cards/$CARD1/reviews" "$TOKEN" '{"rating": 4}'
check_status "review card 1 with rating 4" 201
request POST "/cards/$CARD2/reviews" "$TOKEN" '{"rating": 1}'
check_status "review card 2 with rating 1" 201

check_stats "after 2 reviews" 1 2 1 0.5

##########################################################
#                       TIME ZONES
##########################################################
echo "== Time zones"
request GET "/stats?tz=Asia/Seoul" "$TOKEN"
check_status "tz=Asia/Seoul" 200

request GET /stats "$TOKEN"
check_status "default tz" 200

request GET "/stats?tz=Mars/Base" "$TOKEN"
check_status "tz=Mars/Base" 422
check_value "detail message" "Unknown time zone" "$(json_get detail)"

##########################################################
#                        STREAK
##########################################################
echo "== Streak"
psql_exec "INSERT INTO reviews (id, user_id, card_id, rating, reviewed_at) VALUES
    (gen_random_uuid(), '$USER_ID', '$CARD1', 4, now() - interval '1 day'),
    (gen_random_uuid(), '$USER_ID', '$CARD1', 4, now() - interval '2 days');"

request GET /stats "$TOKEN"
check_value "streak with reviews today, yesterday, 2 days ago" "3" "$(json_get streak_days)"
check_value "reviews_today ignores older reviews" "2" "$(json_get reviews_today)"

##########################################################
#                      SOFT DELETE
##########################################################
echo "== Soft delete"
request DELETE "/decks/$DECK_ID" "$TOKEN"
check_status "delete deck" 204

request GET /stats "$TOKEN"
check_value "cards of deleted deck are not due" "0" "$(json_get cards_due)"
check_value "reviews of deleted deck still count today" "2" "$(json_get reviews_today)"
check_value "streak still 3" "3" "$(json_get streak_days)"

##########################################################
#                      OWNERSHIP
##########################################################
echo "== Ownership"
BEFORE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/stats")

register_and_login "stats_other_$RUN_ID@example.com"
TOKEN2=$(json_get access_token)
request POST /decks "$TOKEN2" '{"name": "Other"}'
OTHER_DECK_ID=$(json_get id)
create_card "$TOKEN2" "$OTHER_DECK_ID" Berlin
request GET "/decks/$OTHER_DECK_ID/due?limit=1" "$TOKEN2"
request POST "/cards/$(json_get 0 id)/reviews" "$TOKEN2" '{"rating": 0}'
check_status "other user reviews their card" 201

request GET /stats "$TOKEN"
check_value "other user's review doesn't change stats" "$BEFORE" "$BODY"

request GET /stats "$TOKEN2"
check_value "other user sees only their review" "1" "$(json_get reviews_today)"

request GET /stats ""
check_status "stats without token" 401

##########################################################
#                       SUMMARY
##########################################################
echo
echo "$PASSED passed, $FAILED failed"
[[ $FAILED -eq 0 ]]
