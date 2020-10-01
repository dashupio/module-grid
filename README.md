Dashup Module Grid
&middot;
[![Latest Github release](https://img.shields.io/github/release/dashup/module-grid.svg)](https://github.com/dashup/module-grid/releases/latest)
=====

A connect interface for grid on [dashup](https://dashup.io).

## Contents
* [Get Started](#get-started)
* [Connect interface](#connect)

## Get Started

This grid connector adds grids functionality to Dashup grids:

```json
{
  "url" : "https://dashup.io",
  "key" : "[dashup module key here]"
}
```

To start the connection to dashup:

`npm run start`

## Deployment

1. `docker build -t dashup/module-grid .`
2. `docker run -d -v /path/to/.dashup.json:/usr/src/module/.dashup.json dashup/module-grid`