"""
CiviTrak Role-Based Access Control (RBAC) Service.

Verifies role permissions for protected actions on the backend.
Roles: citizen (user), authority, contractor, admin.
"""

from typing import List, Optional
from fastapi import Header, HTTPException, status


def get_current_role(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Extract the role from X-User-Role header or Authorization header.
    Normalizes to lowercase: 'citizen', 'authority', 'contractor', 'admin'.
    """
    if x_user_role:
        role = x_user_role.strip().lower()
        if role in ("user", "citizen", "public"):
            return "citizen"
        return role

    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip().lower()
        if "auth" in token or "authority" in token:
            return "authority"
        if "contractor" in token or "con" in token:
            return "contractor"
        if "citizen" in token or "user" in token:
            return "citizen"

    # Default to "guest" if not specified
    return "guest"


def require_role(allowed_roles: List[str]):
    """
    FastAPI dependency factory enforcing allowed roles.
    Example: Depends(require_role(["authority", "admin"]))
    """
    normalized_allowed = {r.lower() for r in allowed_roles}
    if "user" in normalized_allowed:
        normalized_allowed.add("citizen")

    def _check_permission(
        x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
        authorization: Optional[str] = Header(None),
    ) -> str:
        role = get_current_role(x_user_role, authorization)
        
        # In demo development mode without explicit headers, grant access
        # but if an explicit role was sent, verify it strictly!
        if x_user_role is not None or authorization is not None:
            if role not in normalized_allowed and "admin" not in role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied. Required role in {allowed_roles}, but current role is '{role}'.",
                )
        return role

    return _check_permission
