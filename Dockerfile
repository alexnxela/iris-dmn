ARG IMAGE=intersystemsdc/iris-community
FROM --platform=linux/amd64 $IMAGE

WORKDIR /home/irisowner/dev

RUN --mount=type=bind,src=.,dst=. \
    iris start IRIS && \
	iris session IRIS < iris.script && \
    iris stop IRIS quietly

# Change default url for swagger-ui 
RUN sed -i 's|http://localhost:52773/crud/_spec|http://localhost:52773/dmn-api/openapi|g' /usr/irissys/csp/swagger-ui/index.html