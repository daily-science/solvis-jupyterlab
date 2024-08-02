
##

This is based on https://rancavil.medium.com/jupyter-pandas-and-geojson-298c9bd10865

### Build the docker image

```
docker build -t solvis-jupyterlab .
```

### Run jupyter server locally with docker

```
docker run -it --rm -v $(pwd)/WORKDIR:/home/jovyan/WORKDIR --name solvis-demo -p 8888:8888 solvis-jupyterlab
```