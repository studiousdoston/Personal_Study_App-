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

request POST /decks "$TOKEN" '{"name": "Capitals"}'
check_status "alice creates a deck" 201
DECK_ID=$(json_get id)

##########################################################
#                       CREATE
##########################################################
echo "== Create"
request POST "/decks/$DECK_ID/cards" "$TOKEN" '{"front": "  Capital of France?  ", "back": "\n Paris \t"}'
check_status "create card" 201
CARD_ID=$(json_get id)
check_value "front is stripped" "Capital of France?" "$(json_get front)"
check_value "back is stripped" "Paris" "$(json_get back)"
check_value "ease_factor is 2.5" "2.5" "$(json_get ease_factor)"
check_value "ease_factor is a JSON number" "float" "$(json_type ease_factor)"
check_value "interval_days is 0" "0" "$(json_get interval_days)"
check_value "repetitions is 0" "0" "$(json_get repetitions)"
check_true "deleted_at is not returned" "$(python3 -c 'import sys, json; print("no" if "deleted_at" in json.loads(sys.argv[1]) else "yes")' "$BODY" 2>/dev/null)"

request POST "/decks/$DECK_ID/cards" "$TOKEN" '{"front": "   ", "back": "Paris"}'
check_status "create with empty front" 422

LONG_BACK=$(python3 -c 'print("x" * 2001)')
request POST "/decks/$DECK_ID/cards" "$TOKEN" '{"front": "Q", "back": "'$LONG_BACK'"}'
check_status "create with 2001-character back" 422

request POST /decks/00000000-0000-4000-8000-000000000000/cards "$TOKEN" '{"front": "Q", "back": "A"}'
check_status "create in random-uuid deck" 404
check_value "detail is 'Deck not found'" "Deck not found" "$(json_get detail)"

request POST /decks/abc/cards "$TOKEN" '{"front": "Q", "back": "A"}'
check_status "create in deck id 'abc'" 422

##########################################################
#                     LIST AND GET
##########################################################
echo "== List and get"
request POST "/decks/$DECK_ID/cards" "$TOKEN" '{"front": "Capital of Spain?", "back": "Madrid"}'
check_status "create second card" 201
CARD2_ID=$(json_get id)

request GET "/decks/$DECK_ID/cards" "$TOKEN"
check_status "list cards" 200
check_value "list has 2 cards" "2" "$(python3 -c 'import sys, json; print(len(json.loads(sys.argv[1])))' "$BODY" 2>/dev/null)"
check_value "first card is the oldest" "$CARD_ID" "$(json_get 0 id)"
check_value "second card is the newest" "$CARD2_ID" "$(json_get 1 id)"

request GET "/cards/$CARD_ID" "$TOKEN"
check_status "get card" 200
check_value "get returns the right card" "$CARD_ID" "$(json_get id)"

##########################################################
#                       UPDATE
##########################################################
echo "== Update"
request PATCH "/cards/$CARD_ID" "$TOKEN" '{"back": "Paris, France"}'
check_status "patch back only" 200
check_value "back changed" "Paris, France" "$(json_get back)"
check_value "front unchanged after back-only patch" "Capital of France?" "$(json_get front)"

request PATCH "/cards/$CARD_ID" "$TOKEN" '{"front": null}'
check_status "patch front null" 422

request PATCH "/cards/$CARD_ID" "$TOKEN" '{"ease_factor": 9.9, "back": "x"}'
check_status "patch with ease_factor and back" 200
check_value "back changed to 'x'" "x" "$(json_get back)"
check_value "ease_factor still 2.5" "2.5" "$(json_get ease_factor)"

##########################################################
#                       NO TOKEN
##########################################################
echo "== No token"
request GET "/cards/$CARD_ID" ""
check_status "get card without token" 401

##########################################################
#                      OWNERSHIP
##########################################################
echo "== Ownership"
request POST "/decks/$DECK_ID/cards" "$TOKEN2" '{"front": "Hacked", "back": "Hacked"}'
check_status "bob creates a card in alice's deck" 404

request GET "/decks/$DECK_ID/cards" "$TOKEN2"
check_status "bob lists alice's deck" 404

request GET "/cards/$CARD_ID" "$TOKEN2"
check_status "bob gets alice's card" 404
check_value "detail is 'Card not found'" "Card not found" "$(json_get detail)"

request PATCH "/cards/$CARD_ID" "$TOKEN2" '{"front": "Hacked"}'
check_status "bob patches alice's card" 404

request DELETE "/cards/$CARD_ID" "$TOKEN2"
check_status "bob deletes alice's card" 404

request GET "/cards/$CARD_ID" "$TOKEN"
check_status "alice still gets her card" 200
check_value "front unchanged after bob's patch" "Capital of France?" "$(json_get front)"

request GET "/decks/$DECK_ID/cards" "$TOKEN"
check_value "alice's deck still has 2 cards" "2" "$(python3 -c 'import sys, json; print(len(json.loads(sys.argv[1])))' "$BODY" 2>/dev/null)"

##########################################################
#                       DELETE
##########################################################
echo "== Delete"
request DELETE "/cards/$CARD_ID" "$TOKEN"
check_status "delete card" 204
check_value "delete returns empty body" "" "$BODY"

request GET "/cards/$CARD_ID" "$TOKEN"
check_status "get deleted card" 404

request DELETE "/cards/$CARD_ID" "$TOKEN"
check_status "delete already-deleted card" 404

request GET "/decks/$DECK_ID/cards" "$TOKEN"
check_status "list after delete" 200
check_true "deleted card is missing from the list" "$([[ "$(list_contains_card "$CARD_ID")" == "no" ]] && echo yes || echo no)"
check_true "other card is still in the list" "$(list_contains_card "$CARD2_ID")"

##########################################################
#                    ARCHIVED DECK
##########################################################
echo "== Archived deck"
request POST /decks "$TOKEN" '{"name": "To archive"}'
check_status "alice creates a second deck" 201
DECK2_ID=$(json_get id)

request POST "/decks/$DECK2_ID/cards" "$TOKEN" '{"front": "Q", "back": "A"}'
check_status "create card in second deck" 201
CARD3_ID=$(json_get id)

request DELETE "/decks/$DECK2_ID" "$TOKEN"
check_status "delete second deck" 204

request GET "/cards/$CARD3_ID" "$TOKEN"
check_status "get card of archived deck" 404

request GET "/decks/$DECK2_ID/cards" "$TOKEN"
check_status "list cards of archived deck" 404

##########################################################
#                       SUMMARY
##########################################################
echo
echo "$PASSED passed, $FAILED failed"
[[ $FAILED -eq 0 ]]
