---
{{- with .OutputFormats.Get "html" }}
url: {{ .Permalink }}
{{- end }}
{{- with .Description }}
description: {{ . | jsonify }}
{{- end }}
last_updated: {{ .Lastmod.Format "2006-01-02T15:04:05Z07:00" }}
---

# {{ .Title }}

{{ partial "markdown-body" (dict "page" . "tabellen" true) }}
