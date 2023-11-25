# iris-dmn

## About
This solution allows you to visualize business logic (for example, tariff schedule, calculation of insurance payments, etc.) and remove it from the code (the programmers will thank you), leaving it entirely under the control of business analysts

This application is designed to show how you can work with this using IRIS and DMN

![Main](https://github.com/alexnxela/iris-dmn/blob/main/demo.png?raw=true)

## Features
* Write queries to the IRIS database using SQL and receive them in a beautiful form
* Draw a business process in the DMN editor
* Execute DMN solution using data received via SQL

### TODO
* Write a lightweight data converter from CSV => JSON
* Support working with data of more than 100k records

## Installation
1. Clone/git pull the repo into any local directory

```
git clone https://github.com/alexnxela/iris-dmn.git
```
2. Open a Docker terminal in this directory and run:
> Be sure to execute this file, it will download java version 11 (since IRIS uses 8 by default). If you are using windows - (you may need to do this manually)

```
./build.sh
```

3. Run the IRIS container:

```
docker-compose up -d
```
---
**Install with IPM**
```objectscript
zpm "install iris-dmn"
```


## How to run it
### Run the python script in iris container:

```bash
docker-compose up -d 
```
### and then you can follow the link
>**http://localhost:52773/dmn/index.html**