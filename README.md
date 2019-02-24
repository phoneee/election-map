# Thailand Election Map

## Build

Generate vector tile files in ProtoBuf (.pbf) in `/build/vectortile`. Zoom level can be changed by setting **MAX_ZOOM** in `scripts/build-geojson.js` variable (default: 14).

```bash
npm i
npm run build
```

## Demo

Example map loads vector tile as static files, no spatial server is needed.

Launch a local web server from this directory. For example if we run `http-server` at port 8080, browse to `http://127.0.0.1:8080/index.html`.

```bash
npm i -g http-server
http-server .
```
