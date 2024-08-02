FROM jupyter/base-notebook:latest

RUN pip install pandas jupyterlab-geojson geojson

RUN pip install jupyterlab-git

USER root
RUN apt-get update
RUN apt-get install -y git
USER jovyan

RUN pip install git+https://github.com/GNS-Science/solvis.git@b2ce5bd97ff7f0d85a3fdfdf24815bec2b42cdc7
RUN pip install git+https://github.com/GNS-Science/solvis-graphql-api@b77645d230
RUN pip install ipyleaflet

EXPOSE 8888
