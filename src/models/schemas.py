from typing import Optional
from pydantic import BaseModel, Field


class Segment(BaseModel):
    site: str = Field(..., description="Site name (must be one of the configured sites)", examples=["site1"])
    vlan_id: int = Field(ge=1, le=4094, description="VLAN ID (1-4094)", examples=[100])
    epg_name: str = Field(..., description="Endpoint Group name", examples=["EPG_PROD_01"])
    segment: str = Field(..., description="Network segment in CIDR notation (must match site IP prefix)", examples=["192.168.1.0/24"])
    dhcp: bool = Field(default=False, description="Enable DHCP for this segment")
    cluster_name: Optional[str] = Field(default=None, description="Cluster name if allocated, None if available", examples=["cluster-prod-01"])
    released: bool = Field(default=False, description="Whether segment was previously released")

    model_config = {
        "extra": "forbid",
        "json_schema_extra": {
            "examples": [
                {
                    "site": "site1",
                    "vlan_id": 100,
                    "epg_name": "EPG_PROD_01",
                    "segment": "192.168.1.0/24",
                    "dhcp": False
                }
            ]
        }
    }


class VLANAllocationRequest(BaseModel):
    cluster_name: str = Field(..., description="Name of the cluster requesting allocation", examples=["cluster-prod-01"])
    site: str = Field(..., description="Site where VLAN should be allocated", examples=["site1"])

    model_config = {
        "extra": "forbid",
        "json_schema_extra": {
            "examples": [
                {
                    "cluster_name": "cluster-prod-01",
                    "site": "site1"
                }
            ]
        }
    }


class VLANAllocationResponse(BaseModel):
    vlan_id: int = Field(..., description="Allocated VLAN ID", examples=[100])
    cluster_name: str = Field(..., description="Cluster name", examples=["cluster-prod-01"])
    site: str = Field(..., description="Site name", examples=["site1"])
    segment: str = Field(..., description="Allocated network segment", examples=["192.168.1.0/24"])
    epg_name: str = Field(..., description="Endpoint Group name", examples=["EPG_PROD_01"])

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "vlan_id": 100,
                    "cluster_name": "cluster-prod-01",
                    "site": "site1",
                    "segment": "192.168.1.0/24",
                    "epg_name": "EPG_PROD_01"
                }
            ]
        }
    }


class VLANRelease(BaseModel):
    cluster_name: str = Field(..., description="Name of the cluster to release", examples=["cluster-prod-01"])
    site: str = Field(..., description="Site where cluster is allocated", examples=["site1"])

    model_config = {
        "extra": "forbid",
        "json_schema_extra": {
            "examples": [
                {
                    "cluster_name": "cluster-prod-01",
                    "site": "site1"
                }
            ]
        }
    }


class LoginRequest(BaseModel):
    username: str = Field(..., description="Username", examples=["admin"])
    password: str = Field(..., description="Password", examples=["admin"])


class LoginResponse(BaseModel):
    success: bool = Field(..., description="Whether login was successful")
    message: str = Field(..., description="Response message")
    token: Optional[str] = Field(None, description="Session token for API authentication (use as Bearer token)")


class AuthStatusResponse(BaseModel):
    authenticated: bool = Field(..., description="Whether user is authenticated")
