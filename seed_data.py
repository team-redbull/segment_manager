"""One-off script to populate MongoDB with sample segment data via the API."""
import requests

BASE = "http://localhost:8000"
SITE_PREFIXES = {"site1": "192", "site2": "193", "site3": "194"}

session = requests.Session()
r = session.post(f"{BASE}/api/auth/login", json={"username": "admin", "password": "admin"})
print("login:", r.status_code)

created, allocated = 0, 0
for site, prefix in SITE_PREFIXES.items():
    for i in range(20):
        vlan_id = 100 + i
        subnet = i
        seg = {
            "site": site,
            "vlan_id": vlan_id,
            "epg_name": f"EPG_{site.upper()}_{vlan_id}",
            "segment": f"{prefix}.168.{subnet}.0/24",
            "dhcp": (i % 2 == 0),
        }
        r = session.post(f"{BASE}/api/segments", json=seg)
        if r.status_code in (200, 201):
            created += 1
        else:
            print("create failed:", site, vlan_id, r.status_code, r.text[:200])

# Allocate a few VLANs per site
for site in SITE_PREFIXES:
    for c in range(1, 4):
        r = session.post(f"{BASE}/api/allocate-vlan", json={"cluster_name": f"cluster-{site}-{c:02d}", "site": site})
        if r.status_code == 200:
            allocated += 1
        else:
            print("allocate failed:", site, r.status_code, r.text[:200])

print(f"Created: {created}, Allocated: {allocated}")
