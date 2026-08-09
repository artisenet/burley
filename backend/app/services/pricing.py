"""
Central place for the "don't bleed money" business rule. Any code computing
a selling price or checking a margin should go through here rather than
re-implementing the formula, so the floor is consistent everywhere (quote
creation, quote editing, event profitability dashboard).
"""

MARGIN_FLOOR_PCT = 35.0


def compute_selling_price(cost_price, markup_pct):
    cost_price = float(cost_price)
    markup_pct = float(markup_pct)
    return round(cost_price * (1 + markup_pct / 100), 2)


def compute_margin_pct(cost_price, selling_price):
    cost_price = float(cost_price)
    selling_price = float(selling_price)
    if cost_price == 0:
        return None
    return round((selling_price - cost_price) / cost_price * 100, 2)


def is_below_margin_floor(cost_price, selling_price, floor_pct=MARGIN_FLOOR_PCT):
    margin = compute_margin_pct(cost_price, selling_price)
    if margin is None:
        return False
    return margin < floor_pct


def margin_warning(cost_price, selling_price, floor_pct=MARGIN_FLOOR_PCT):
    """Returns a warning string for the UI, or None if margin is healthy."""
    margin = compute_margin_pct(cost_price, selling_price)
    if margin is None:
        return None
    if margin < floor_pct:
        return (
            f"This price sits at a {margin}% margin, below the {floor_pct}% target. "
            f"You can still proceed, but check this is intentional."
        )
    return None
