import time

from app.schemas.ai import DraftCard, GenerateCardsRequest


DELAY_SECONDS = 1.5
MAX_LINE_LENGTH = 80


def generate_cards(request: GenerateCardsRequest, existing_fronts: list[str]) -> list[DraftCard]:
    time.sleep(DELAY_SECONDS)

    lines = [line.strip() for line in request.sources[0].text.splitlines() if line.strip()]
    suffix = f" [{request.instructions}]" if request.instructions else ""

    cards = []
    for index in range(request.new_card_count):
        number = index + 1
        line = lines[index % len(lines)][:MAX_LINE_LENGTH]
        if request.mode == "qa":
            front = f"Q{number}: What does this mean? {line}"
            back = f"A{number}: {line}{suffix}"
        else:
            front = f"Word {number}: {line}"
            back = f"Meaning {number} of {line}{suffix}"
        cards.append(DraftCard(front=front, back=back))
    return cards
