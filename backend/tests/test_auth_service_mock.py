from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.modules.auth.application.services import AuthService
from app.shared.exceptions import AppException


def test_create_user_passes_role_slug_to_repository():
    repository = MagicMock()
    repository.get_user_by_username.return_value = None
    expected_user = SimpleNamespace(id=10, username="mock-user")
    repository.create_user.return_value = expected_user
    service = AuthService(repository)

    result = service.create_user(
        email="mock@ayniflow.local",
        username="mock-user",
        password="Mock12345!",
        full_name="Mock User",
        role_slug="reader",
    )

    assert result is expected_user
    repository.create_user.assert_called_once_with(
        email="mock@ayniflow.local",
        username="mock-user",
        password="Mock12345!",
        full_name="Mock User",
        role_slug="reader",
    )


def test_update_user_raises_not_found_with_mock_repository():
    repository = MagicMock()
    repository.get_user_by_id.return_value = None
    service = AuthService(repository)

    with pytest.raises(AppException) as err:
        service.update_user(user_id=999, full_name="No existe")

    assert err.value.status_code == 404
    assert "no encontrado" in str(err.value).lower()


def test_update_user_maps_repository_value_errors_to_app_exception():
    repository = MagicMock()
    repository.get_user_by_id.return_value = SimpleNamespace(id=2)
    repository.update_user.side_effect = ValueError("Rol inválido")
    service = AuthService(repository)

    with pytest.raises(AppException) as err:
        service.update_user(user_id=2, role_slug="rol-que-no-existe")

    assert err.value.status_code == 400
    assert "rol inválido" in str(err.value).lower()
