ENV = ~/Envs/ds2026ISFPP/bin/activate

.PHONY: back front

back:
	@echo "Iniciando Backend..."
	bash -c "source $(ENV) && cd backend && python seed.py && fastapi dev src/main.py"

front:
	@echo "Iniciando Frontend..."
	bash -c "source $(ENV) && cd frontend && npm install && npm run dev"
