from bot.execution.risk import trade_risk


def test_trade_risk_calculation():
    assert trade_risk(100, 95, 2) == 10
