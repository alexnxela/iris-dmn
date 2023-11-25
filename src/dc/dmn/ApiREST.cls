Class dc.dmn.ApiREST Extends Api.REST.Base
{

Parameter Version = "1.0.6";

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>

<!-- api routes -->
<Route Url="/" Method="GET" Call="status" Cors="true"/>
<Route Url="/upload" Method="POST" Call="upload"/>
<Route Url="/download" Method="POST" Call="download"/>
<Route Url="/sql" Method="POST" Call="sql"/>
<Route Url="/execute" Method="POST" Call="execute"/>

<!-- Swagger openapi description -->
<Route Url="/openapi" Method="GET" Call="openapi" />

</Routes>
}

ClassMethod status() As %Status
{
    Set %response.ContentType = ..#CONTENTTYPEJSON
    Set env = $SYSTEM.Util.GetEnviron("DMN_ENV")
    Set info = {
      "status": true,
      "env": (env)
    }

    RETURN ..%ProcessResult($$$OK, info)
}

// Execute dmn

ClassMethod execute() As %Status
{
    Set %response.ContentType = ..#CONTENTTYPEJSON

    Set gateway = $system.external.getJavaGateway()

    Set dmnJarPath = $system.Util.GetEnviron("DMN_JAR_PATH")

    Do gateway.addToPath(dmnJarPath)
    Set proxy = gateway.new("org.dmn.Main")


    Set dmnDataPath = $system.Util.GetEnviron("DMN_DATA_PATH")
    Set uuid = $System.Util.CreateGUID()

    Set logFileName = "dmn-exec-" _ uuid _ ".log"
    Set logFilePath = dmnDataPath _ "/" _ logFileName
    Open logFilePath:"WNS"
    Use logFilePath

    Set data=%request.Content
    Set cmd = dmnDataPath _ "/" _ data.dmn _ ";" _ dmnDataPath _ "/" _ data.data

    Set resultPathFile = $System.Util.CreateGUID()
    Set resultFileName = "dmn-result-" _ resultPathFile _ ".json"
    Set cmd = cmd _ ";" _ dmnDataPath _ "/" _ resultFileName

    set output = proxy.start(cmd)

    Close logFilePath
    
    Set fileStream = ##class(%Stream.FileCharacter).%New()
    Set status = fileStream.LinkToFile(logFilePath)

    Do fileStream.Rewind()
    Set meta = fileStream.Read()
    Do fileStream.%Close()

    
    SET info = {
      "status": "ok",
      "data": (output),
      "meta": (meta),
      "log": (logFileName),
      "result": (resultFileName)
    }

    RETURN ..%ProcessResult($$$OK, info)
}

/// upload data
ClassMethod upload() As %Status
{
    Set %response.Status = 200
    Set %response.ContentType = ..#CONTENTTYPEJSON

    Set data=%request.Content

    Set dmnDataPath = $system.Util.GetEnviron("DMN_DATA_PATH")
    Set dmnDataFilePath = dmnDataPath _ "/" _ data.file

    Set fileStream = ##class(%Stream.FileCharacter).%New()
    Set status = fileStream.LinkToFile(dmnDataFilePath)

    If $$$ISERR(status) {
        Set error = $System.Status.GetOneErrorText(status)
        Set info = {
            "status": "error",
            "error": (error)
        }
    } else {
        Do fileStream.Rewind()
        Do fileStream.Write(data.content)
        Do fileStream.%Save()

        Set info = {
            "status": "ok",
            "data": (data),
            "file_path": (dmnDataFilePath)
        }
    }

    Return ..%ProcessResult($$$OK, info)
}

/// run sql
ClassMethod sql() As %Status
{
    Set %response.Status = 200
    Set %response.ContentType = ..#CONTENTTYPEJSON

    Set data=%request.Content

    Set sql = ##class(%SQL.Statement).%New()

    Set sqlStatus = sql.%Prepare(data.sql)

    If $$$ISERR(sqlStatus) {
        Set info = {
            "status": "error",
            "error":  ($System.Status.GetOneErrorText(sqlStatus))
        }

        Return ..%ProcessResult($$$OK, info)
    } else {
        Set sqlResult = sql.%Execute()

        If $$$ISERR(sqlResult) {
            Set info = {
                "status": "error"
                //"error":  (sqlResult.Data)
            }

            Return ..%ProcessResult($$$OK, info)
        } else {

            if sqlResult.%SQLCODE = 0 {
                Set uuid = $System.Util.CreateGUID()
                Set dmnDataPath = $system.Util.GetEnviron("DMN_DATA_PATH")
                Set resultFilePath = dmnDataPath _ "/" _ uuid

                Set type = data.%Get("type", "CSV")

                do sqlResult.%DisplayFormatted(type, resultFilePath)

                Set resultFilePathStream = ##class(%Stream.FileCharacter).%New()
                Set status = resultFilePathStream.LinkToFile(resultFilePath _ "." _ type)

                Do resultFilePathStream.Rewind()
                Set content = resultFilePathStream.Read()
                Do resultFilePathStream.%Close()

                Set info = {
                    "status": "ok",
                    "data": (content),
                    "file_path": (resultFilePath)
                }

                Return ..%ProcessResult($$$OK, info)
            } else {
                Set error = $System.Status.GetOneErrorText(sqlResult)
                Set info = {
                    "status": "error",
                    "error": (error)
                }

                Return ..%ProcessResult($$$OK, info)
            }
        }
    }

    Set info = {
        "status": "error",
        "error": "empty"
    }

    Return ..%ProcessResult($$$OK, info)
}

/// download
ClassMethod download() As %Status
{
    Set %response.Status = 200
    Set %response.ContentType = ..#CONTENTTYPEJSON

    Set data=%request.Content


    Set dmnDataPath = $system.Util.GetEnviron("DMN_DATA_PATH")
    Set resultFilePath = dmnDataPath _ "/" _ data.file

    Set resultFilePathStream = ##class(%Stream.FileCharacter).%New()
    Set status = resultFilePathStream.LinkToFile(resultFilePath)
    If $$$ISERR(status) {
        Set error = $System.Status.GetOneErrorText(status)
        Set info = {
            "status": "error",
            "error": (error)
        }
    } else {
        Do resultFilePathStream.Rewind()
        Set content = resultFilePathStream.Read()
        Do resultFilePathStream.%Close()

        Set info = {
            "status": "ok",
            "data": (content)
        }
    }


    Return ..%ProcessResult($$$OK, info)
}

ClassMethod openapi() As %Status
{
    Set tSC = ##class(%REST.API).GetWebRESTApplication($NAMESPACE, %request.Application, .swagger)
    Do swagger.info.%Remove("x-ISC_Namespace")
    Set swagger.basePath = "/dmn-api"
    Set swagger.info.title = "InterSystems DMN api"
    Set swagger.info.version = "0.1"
    Set swagger.host = "localhost:52773"
    Return ..%ProcessResult($$$OK, swagger)
}

}
