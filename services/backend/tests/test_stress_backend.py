from tools.stress_backend import Observation, Results, exit_code_for


def observation(outcome: str) -> Observation:
    return Observation(
        category="test",
        name="exit-code",
        outcome=outcome,
        expected="pass",
        observed=outcome,
        elapsed_ms=0,
    )


def test_stress_exit_code_requires_nonempty_all_pass_results() -> None:
    results = Results()
    assert exit_code_for(results) == 1

    results.items = [observation("pass")]
    assert exit_code_for(results) == 0

    results.items.append(observation("break"))
    assert exit_code_for(results) == 1

    results.items = [observation("harness_exception")]
    assert exit_code_for(results) == 1
