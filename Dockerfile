FROM jupyter/base-notebook:latest

RUN pip install pandas jupyterlab-geojson geojson

RUN pip install jupyterlab-git

USER root
RUN apt-get update
RUN apt-get install -y git
USER jovyan

RUN pip install git+https://github.com/GNS-Science/solvis.git@4444d86ea9811f5faed3e911bbeacc17116e8d23
RUN pip install git+https://github.com/GNS-Science/solvis-graphql-api@b77645d230
RUN pip install ipyleaflet

EXPOSE 8888
