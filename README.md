# Knowledge Graph Application

## Overview
This repository contains a fullstack application designed to ingest documents, build a semantic knowledge graph using Neo4j, and provide search and chat capabilities. The backend is implemented in Python (FastAPI) and the frontend is built with Next.js.

## What It Does 

### The Problem This Solves
Imagine you have a large collection of documents—contracts, reports, emails, research papers, or any other business content. Finding specific information across all these documents can be like searching for a needle in a haystack. Traditional search tools only match exact keywords, missing related concepts and connections.

### How This Application Helps
This application transforms your document collection into an intelligent, interconnected web of knowledge. Here's what it does in plain terms:

**Document Ingestion**
- You upload your documents through an easy-to-use web interface
- The system processes them automatically in the background (no waiting around)
- It extracts key information and relationships between concepts

**Knowledge Graph Creation**
- Think of it as creating a "mind map" of your content
- The system identifies how people, places, topics, and ideas connect to each other
- All these connections are stored in a specialized database that understands relationships

**Intelligent Q&A**
- Instead of searching with keywords, you can ask questions in plain English
- Example: "Which contracts mention both Company A and Company B?" or "Show me all projects related to marketing in 2024"
- The system understands context and finds answers across your entire document library

**Visual Exploration**
- See your knowledge as an interactive network diagram
- Click on any topic to explore connected information
- Discover unexpected relationships you might have missed

### Who Uses This?
- **Researchers** analyzing large document sets
- **Legal teams** reviewing contracts and case files
- **Consultants** mapping client relationships and opportunities
- **Knowledge managers** organizing company information
- **Analysts** connecting data points across reports

### Key Benefits
- **Save Time**: Find answers in seconds instead of hours
- **Discover Insights**: Uncover hidden connections in your data
- **Ask Naturally**: No need to learn complex search syntax
- **Scale Effortlessly**: Handles thousands of documents without slowing down

## A Day in the Life: How You Would Use This

### Step 1: Upload Your Documents
You drag and drop your files (PDFs, Word docs, text files) into the web interface. The system accepts them and immediately starts processing, no need to wait for uploads to finish.

### Step 2: Let the System Work
While you continue with your day, the application:
- Reads through each document
- Identifies important entities (people, companies, dates, topics)
- Maps how these entities relate to each other
- Builds a searchable knowledge network

### Step 3: Ask Questions
Later, when you need information, you simply type questions like:
- "What did we agree to in the contract?"
- "Show me all projects that involve both marketing and budget over $100K"
- "Which clients have we worked with in the healthcare industry?"

### Step 4: Explore Visually
You can also browse a visual map of your knowledge—click on any person, company, or topic to see everything connected to it. It's like having a living mind map of your entire document library.


## Architecture

### Backend
- **Core** (`app/core/`): 
  - `celery_app.py` - Celery task queue for asynchronous jobs.
  - `config.py` - Configuration management.
  - `security.py` - Authentication and authorization utilities.
- **Models** (`app/models/`): 
  - Defines Pydantic models for documents, users, and graph nodes.
- **Services** (`app/services/`): 
  - `document_cleanup.py`, `graph_db_service.py`, `llm.py`, `storage.py`, `tasks.py` - Business logic for document processing, graph operations, LLM integration, storage, and task management.
  - Sub‑folder `chat/` contains `nodes.py`, `state.py`, `workflow.py` for chatbot behavior.
- **API** (`app/api/`): 
  - Routes (`auth.py`, `chat.py`, `graph.py`, `ingest.py`) expose RESTful endpoints.
- **Database** (`app/db/`): 
  - `neo4j_client.py` - Wrapper around Neo4j driver.
  - `session.py` - Manages Neo4j sessions.
  - `base.py` - Base ORM definitions.
- **Migrations** (`alembic/`): 
  - Database migration scripts using Alembic.

### Frontend
- **UI** built with **shadcn/ui** components.
- Pages located under `src/app/` (e.g., `layout.tsx`, `page.tsx`, various feature modules like `chat`, `ingest`, `dashboard`).
- Utility libraries in `src/lib/` (`api-client.ts`, `auth-fetch.ts`, `graph-client.ts`).
- Type definitions in `src/types/`.

### Infrastructure
- **Docker** orchestration via `docker-compose.yml`:
  - Starts backend services, Neo4j, and optionally frontend.
- **Testing** (`tests/`): 
  - Unit and integration tests for backend functionality.

## Getting Started

### Prerequisites
- Docker Desktop
- Python 3.11+ (for local development)
- Node.js 20+ (for frontend)

### Running with Docker Compose
```bash
docker-compose up --build
```
- Backend will be available at `http://localhost:8000`.
- Neo4j UI at `http://localhost:7474`.
- Frontend at `http://localhost:3000`.

### Local Development
1. **Backend**  
   ```bash
   cd backend
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload
   ```
2. **Frontend**  
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Environment Variables
Create a `.env` file in the root with:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=yourpassword
SECRET_KEY=yoursecretkey
```

## Project Structure (Tree)
```
.
├─ docker-compose.yml
├─ README.md
├─ skills-lock.json
├─ ui-dark.md
├─ ui.md
├─ alembic.ini
├─ Dockerfile
├─ requirements.docker.txt
├─ requirements.txt
├─ backend/
│  ├─ alembic/
│  ├─ app/
│  │  ├─ __init__.py
│  │  ├─ main.py
│  │  ├─ api/
│  │  │  ├─ __init__.py
│  │  │  ├─ routes/
│  │  │  │  ├─ __init__.py
│  │  │  │  ├─ auth.py
│  │  │  │  ├─ chat.py
│  │  │  │  ├─ graph.py
│  │  │  │  └─ ingest.py
│  │  ├─ core/
│  │  │  ├─ celery_app.py
│  │  │  ├─ config.py
│  │  │  └─ security.py
│  │  ├─ db/
│  │  │  ├─ base.py
│  │  │  ├─ neo4j_client.py
│  │  │  └─ session.py
│  │  ├─ models/
│  │  │  ├─ __init__.py
│  │  │  ├─ document.py
│  │  │  ├─ graph_extraction.py
│  │  │  └─ user.py
│  │  └─ services/
│  │     ├─ document_cleanup.py
│  │     ├─ graph_db_service.py
│  │     ├─ llm.py
│  │     ├─ storage.py
│  │     ├─ tasks.py
│  │     └─ chat/
│  │        ├─ nodes.py
│  │        ├─ state.py
│  │        └─ workflow.py
│  ├─ tests/
│  └─ ...
├─ frontend/
│  ├─ .next/
│  ├─ public/
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx
│  │  │  ├─ api/
│  │  │  │  └─ auth/
│  │  │  │     ├─ register/
│  │  │  │        └─ page.tsx
│  │  │  ├─ chat/
│  │  │  │  └─ page.tsx
│  │  │  ├─ dashboard/
│  │  │  │  └─ page.tsx
│  │  │  ├─ ingest/
│  │  │  │  └─ page.tsx
│  │  │  ├─ profile/
│  │  │  │  └─ page.tsx
│  │  │  ├─ register/
│  │  │  │  └─ page.tsx
│  │  │  └─ ...
│  │  ├─ components/
│  │  │  ├─ app-shell.tsx
│  │  │  ├─ chat-interface.tsx
│  │  │  ├─ document-actions.tsx
│  │  │  ├─ ingest-wizard.tsx
│  │  │  ├─ knowledge-graph.tsx
│  │  │  ├─ session-provider.tsx
│  │  │  ├─ theme-provider.tsx
│  │  │  ├─ theme-toggle.tsx
│  │  │  ├─ workspace-layout.tsx
│  │  │  └─ ui/
│  │  │     ├─ alert.tsx
│  │  │     ├─ badge.tsx
│  │  │     ├─ button.tsx
│  │  │     └─ ...
│  │  ├─ lib/
│  │  │  ├─ api-client.ts
│  │  │  ├─ auth-fetch.ts
│  │  │  ├─ auth.ts
│  │  │  ├─ graph-client.ts
│  │  │  └─ utils.ts
│  │  └─ types/
│  │     ├─ chat.ts
│  │     ├─ graph.ts
│  │     └─ next-auth.d.ts
│  ├─ styles/
│  │  └─ globals.css
│  ├─ types/
│  │  └─ index.d.ts
│  ├─ next.config.ts
│  ├─ package.json
│  ├─ postcss.config.mjs
│  ├─ tsconfig.json
│  └─ ...
└─ tests/
   ├─ __init__.py
   ├─ test_document_cleanup.py
   ├─ test_graph_db_service.py
   └─ ...
```

