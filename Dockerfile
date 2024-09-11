FROM quay.io/jupyter/base-notebook:latest

RUN pip install pandas jupyterlab-geojson geojson

USER root
RUN apt-get update
RUN apt-get install -y git
USER jovyan

RUN pip install git+https://github.com/GNS-Science/solvis.git@22d3c5cf058c1a93f99ad01ebae57ec7d4b2a5fb
RUN pip install git+https://github.com/GNS-Science/solvis-graphql-api@b77645d230
RUN pip install ipyleaflet
RUN pip install "anywidget[dev]"

EXPOSE 8888
