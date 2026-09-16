import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.baseline_rating import BaselineRating
from app.models.experiment import Experiment
from app.models.human_evaluation import HumanEvaluation
from app.models.llm_evaluation import LLMEvaluation
from app.models.question import Question
from app.models.rating_share_link import RatingShareLink
from app.models.response import AIResponse
from app.models.risk_result import RiskResult


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def clean_db(db_session):
    db_session.query(RiskResult).delete()
    db_session.query(BaselineRating).delete()
    db_session.query(RatingShareLink).delete()
    db_session.query(HumanEvaluation).delete()
    db_session.query(LLMEvaluation).delete()
    db_session.query(AIResponse).delete()
    db_session.query(Experiment).delete()
    db_session.query(Question).delete()
    db_session.commit()
    return db_session
