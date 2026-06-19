FROM postgis/postgis:17-3.5

ENV POSTGRES_DB=dvf_plus
ENV POSTGRES_USER=dvf_plus
ENV POSTGRES_PASSWORD=dvf_plus

COPY initdb/ /docker-entrypoint-initdb.d/
