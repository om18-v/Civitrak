# CiviTrak Role Access Matrix

| Area | Citizen | Authority | Contractor |
|---|---:|---:|---:|
| Citizen Portal | ✓ | — | — |
| Upload & Scan | ✓ | — | — |
| AI Results | ✓ | — | — |
| GIS Map | ✓ | ✓ | ✓ |
| Public Ratings | ✓ | — | — |
| Authority Control | — | ✓ | — |
| Contractor Workbench | — | — | ✓ |

The UI navigation is role-specific and the router enforces the same boundary. This prevents the three portals from becoming one mixed dashboard.
