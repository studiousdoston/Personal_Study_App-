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

json_type() {
    python3 -c 'import sys, json
data = json.loads(sys.argv[1])
for key in sys.argv[2:]:
    data = data[int(key)] if isinstance(data, list) else data[key]
print(type(data).__name__)' "$BODY" "$@" 2>/dev/null
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

list_contains_card() {
    python3 -c 'import sys, json
print("yes" if any(c["id"] == sys.argv[2] for c in json.loads(sys.argv[1])) else "no")' "$BODY" "$1" 2>/dev/null
}

json_len() {
    python3 -c 'import sys, json; print(len(json.loads(sys.argv[1])))' "$BODY" 2>/dev/null
}

seconds_from_now() {
    python3 -c 'import sys
from datetime import datetime, timezone
when = datetime.fromisoformat(sys.argv[1])
print(int((when - datetime.now(timezone.utc)).total_seconds()))' "$1" 2>/dev/null
}

psql_value() {
    (cd "$(dirname "$0")/.." && docker compose exec -T db psql -U DeenDoston -d study_app -t -A -c "$1")
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

request POST /decks "$TOKEN" '{"name": "Reviews"}'
check_status "alice creates a deck" 201
DECK_ID=$(json_get id)

request POST "/decks/$DECK_ID/cards" "$TOKEN" '{"front": "Capital of France?", "back": "Paris"}'
check_status "create card 1" 201
CARD1_ID=$(json_get id)

request POST "/decks/$DECK_ID/cards" "$TOKEN" '{"front": "Capital of Spain?", "back": "Madrid"}'
check_status "create card 2" 201
CARD2_ID=$(json_get id)

request POST "/decks/$DECK_ID/cards" "$TOKEN" '{"front": "Capital of Italy?", "back": "Rome"}'
check_status "create card 3" 201
CARD3_ID=$(json_get id)

##########################################################
#                       DUE LIST
##########################################################
echo "== Due list"
request GET "/decks/$DECK_ID/due" "$TOKEN"
check_status "due list" 200
check_value "all 3 new cards are due" "3" "$(json_len)"
check_value "most overdue card is first" "$CARD1_ID" "$(json_get 0 id)"

request GET "/decks/$DECK_ID/due?limit=2" "$TOKEN"
check_status "due list with limit=2" 200
check_value "limit=2 returns 2 cards" "2" "$(json_len)"

request GET "/decks/$DECK_ID/due?limit=0" "$TOKEN"
check_status "due list with limit=0" 422

request GET "/decks/$DECK_ID/due?limit=101" "$TOKEN"
check_status "due list with limit=101" 422

##########################################################
#                       REVIEW
##########################################################
echo "== Review"
request POST "/cards/$CARD1_ID/reviews" "$TOKEN" '{"rating": 4, "time_taken_ms": 3500}'
check_status "review card 1 with rating 4" 201
check_value "returns the reviewed card" "$CARD1_ID" "$(json_get id)"
check_value "repetitions is 1" "1" "$(json_get repetitions)"
check_value "interval_days is 1" "1" "$(json_get interval_days)"
check_value "ease_factor stays 2.5" "2.5" "$(json_get ease_factor)"
check_true "last_reviewed_at is set" "$([[ "$(json_get last_reviewed_at)" != "null" ]] && echo yes || echo no)"
SECONDS_LEFT=$(seconds_from_now "$(json_get next_review_at)")
check_true "next_review_at is about 1 day from now ($SECONDS_LEFT s)" "$([[ -n "$SECONDS_LEFT" && $SECONDS_LEFT -gt 86340 && $SECONDS_LEFT -le 86400 ]] && echo yes || echo no)"

request GET "/decks/$DECK_ID/due" "$TOKEN"
check_status "due list after review" 200
check_value "due list now has 2 cards" "2" "$(json_len)"
check_true "reviewed card is not due" "$([[ "$(list_contains_card "$CARD1_ID")" == "no" ]] && echo yes || echo no)"

request POST "/cards/$CARD1_ID/reviews" "$TOKEN" '{"rating": 4}'
check_status "review card 1 again with rating 4" 201
check_value "interval_days is 6" "6" "$(json_get interval_days)"
check_value "repetitions is 2" "2" "$(json_get repetitions)"

request POST "/cards/$CARD2_ID/reviews" "$TOKEN" '{"rating": 2}'
check_status "review card 2 with rating 2" 201
check_value "repetitions is 0" "0" "$(json_get repetitions)"
check_value "interval_days is 1" "1" "$(json_get interval_days)"
EASE=$(json_get ease_factor)
check_true "ease_factor below 2.5 ($EASE)" "$(python3 -c 'import sys; print("yes" if float(sys.argv[1]) < 2.5 else "no")' "$EASE" 2>/dev/null)"

##########################################################
#                      VALIDATION
##########################################################
echo "== Validation"
request POST "/cards/$CARD3_ID/reviews" "$TOKEN" '{"rating": 6}'
check_status "rating 6" 422

request POST "/cards/$CARD3_ID/reviews" "$TOKEN" '{}'
check_status "missing rating" 422

request POST "/cards/$CARD3_ID/reviews" "$TOKEN" '{"rating": 4, "time_taken_ms": -1}'
check_status "time_taken_ms -1" 422

request POST /cards/00000000-0000-4000-8000-000000000000/reviews "$TOKEN" '{"rating": 4}'
check_status "review random-uuid card" 404
check_value "detail is 'Card not found'" "Card not found" "$(json_get detail)"

request POST /cards/abc/reviews "$TOKEN" '{"rating": 4}'
check_status "review card id 'abc'" 422

request POST "/cards/$CARD3_ID/reviews" "" '{"rating": 4}'
check_status "review without token" 401

##########################################################
#                      OWNERSHIP
##########################################################
echo "== Ownership"
request GET "/decks/$DECK_ID/due" "$TOKEN2"
check_status "bob gets alice's due list" 404
check_value "detail is 'Deck not found'" "Deck not found" "$(json_get detail)"

request POST "/cards/$CARD3_ID/reviews" "$TOKEN2" '{"rating": 4}'
check_status "bob reviews alice's card" 404

##########################################################
#                  SOFT-DELETED CARD
##########################################################
echo "== Soft-deleted card"
request DELETE "/cards/$CARD3_ID" "$TOKEN"
check_status "alice deletes card 3" 204

request POST "/cards/$CARD3_ID/reviews" "$TOKEN" '{"rating": 4}'
check_status "review deleted card" 404

##########################################################
#                    DATABASE CHECK
##########################################################
echo "== Database check"
IDS="'$CARD1_ID', '$CARD2_ID', '$CARD3_ID'"
check_value "3 review rows in total" "3" "$(psql_value "SELECT count(*) FROM reviews WHERE card_id IN ($IDS)")"
check_value "card 1 has 2 review rows" "2" "$(psql_value "SELECT count(*) FROM reviews WHERE card_id = '$CARD1_ID'")"
check_value "card 2 has 1 review row" "1" "$(psql_value "SELECT count(*) FROM reviews WHERE card_id = '$CARD2_ID'")"
check_value "card 3 has no review rows" "0" "$(psql_value "SELECT count(*) FROM reviews WHERE card_id = '$CARD3_ID'")"
check_value "card 1 ratings and times" "4|3500,4|" "$(psql_value "SELECT string_agg(rating || '|' || coalesce(time_taken_ms::text, ''), ',' ORDER BY reviewed_at) FROM reviews WHERE card_id = '$CARD1_ID'")"
check_value "reviewed_at matches card 1 last_reviewed_at" "t" "$(psql_value "SELECT max(r.reviewed_at) = c.last_reviewed_at FROM reviews r JOIN cards c ON c.id = r.card_id WHERE c.id = '$CARD1_ID' GROUP BY c.last_reviewed_at")"

##########################################################
#                       SUMMARY
##########################################################
echo
echo "$PASSED passed, $FAILED failed"
[[ $FAILED -eq 0 ]]
