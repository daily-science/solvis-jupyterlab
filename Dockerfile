FROM jupyter/base-notebook:latest

RUN pip install pandas jupyterlab-geojson geojson

RUN pip install jupyterlab-git

USER root
RUN apt-get update
RUN apt-get install -y git
USER jovyan

RUN pip install git+https://github.com/GNS-Science/solvis.git@9028626c5b4728

EXPOSE 8888
