.PHONY: grounded-prompt test-grounding

grounded-prompt:
	cd backend && python3 -m app.scripts.build_grounded_prompt

test-grounding:
	cd backend && python3 -m pytest tests/test_reference_grounding.py tests/test_source_rag.py -q
