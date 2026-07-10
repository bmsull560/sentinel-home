# Observability

This directory contains version-controlled dashboards and alerting rules for Sentinel Home.

## Structure

```
observability/
├── grafana/
│   └── dashboards/
│       └── sentinel-home.json    # Platform overview dashboard
└── prometheus/
    └── alerts.yml                # Prometheus alerting rules
```

## Grafana dashboards

Import `grafana/dashboards/sentinel-home.json` into your Grafana instance. The dashboard expects a Prometheus data source named `default` (or select your own via the `prometheus_datasource` variable) and a `job` label matching your scrape configuration (default: `sentinel-home`).

Dashboard sections:

- **Platform Health** — instance up/memory/error rate/latency at a glance
- **API Performance** — request rate, error rate, and latency percentiles by route
- **Worker Health** — ingestion scheduler and pipeline run rates/success
- **Database Operations** — placeholder for mysqld_exporter or cloud DB metrics

## Prometheus alerts

Apply `prometheus/alerts.yml` to your Prometheus ruler. Each alert includes:

- `severity` — `critical` or `warning`
- `team` / `owner` — responsible team/role
- `runbook_url` — link to `RUNBOOKS.md`
- `dashboard_url` — link to the Grafana dashboard

Update the `dashboard_url` annotations to match your Grafana deployment.

## Validation

```bash
# Validate dashboard JSON
node -e "JSON.parse(require('fs').readFileSync('observability/grafana/dashboards/sentinel-home.json'))"

# Validate Prometheus alert rules (requires promtool)
promtool check rules observability/prometheus/alerts.yml
```

## Future additions

- Grafana alerting provisioning YAML for unified alert management.
- OpenTelemetry Collector configuration for trace aggregation.
- Log aggregation dashboards using Loki or equivalent.
