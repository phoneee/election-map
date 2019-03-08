# Thailand Election Map

## Build

Generate vector tile files in ProtoBuf (.pbf) in `/build/vt/*` using [tippecanoe](https://github.com/mapbox/tippecanoe). Because we build map as static files, no geospatial server is needed.

```bash
mkdir -p dist/build/vt/
tippecanoe -e dist/build/vt/thaielection2562 --no-tile-compression thaielection2562.geojson
tippecanoe -e dist/build/vt/province --no-tile-compression province.geojson
```

Next we need to generate static site. Choose target hostname by setting environment variable `HOSTNAME=`. Edit map vector tile hostname (`map_hostname`) in `generate-site.js`, i.e. `http://127.0.0.1:8080` if it's hosted on different website.

```bash
npm i handlebars

HOSTNAME=http://localhost:8080 node generate-site.js
```

## Development

Launch a local web server from this directory. For example if we run `http-server`.

```bash
npm i -g http-server
http-server dist/
```

Then browse to `http://127.0.0.1:8080`.
