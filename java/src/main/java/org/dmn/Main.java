package org.dmn;

import org.apache.commons.io.FileUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.drools.io.FileSystemResource;
import org.json.JSONArray;
import org.json.JSONObject;
import org.kie.api.KieServices;
import org.kie.api.io.Resource;
import org.kie.api.runtime.KieContainer;
import org.kie.dmn.api.core.*;
import org.kie.dmn.api.core.ast.InputDataNode;
import org.kie.dmn.core.compiler.RuntimeTypeCheckOption;
import org.kie.dmn.core.impl.DMNRuntimeImpl;
import org.kie.dmn.core.util.KieHelper;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Main {
    public String start (String str) {
        try {
            if (Objects.equals(str, "test")) {
                log.info("ok");
                return "ok";
            }
            String[] args = str.split(";");
            main(args);
        } catch (Exception e) {
            log.info("Error:" + e.getMessage());
        }
        log.info("end");
        return "success";
    }

    private static final Logger log = LogManager.getLogger("dmn");
    public static void main(String[] args) throws IOException {
        Path currentDir = Paths.get("");
        log.info("dir:" + currentDir.toAbsolutePath());

        JSONObject result = new JSONObject();
        result.put("status", true);
        result.put("data", new JSONArray());

        try {
            KieServices ks = KieServices.Factory.get();

            String file = (args.length > 0 && args[0] != null) ? args[0] : "test.dmn";
            Resource resource = new FileSystemResource(new File(file));

            KieContainer cnt = KieHelper.getKieContainer(
                    ks.newReleaseId("org.kie", "dmn-test-" + UUID.randomUUID(), "1.0"),
                    resource);

            DMNRuntime dmnRuntime = typeSafeGetKieRuntime(cnt);

            List<DMNModel> models = dmnRuntime.getModels();
            if (models.isEmpty()) {
                log.error("Models not found");
                return;
            }

            DMNModel dmnModel = models.get(0);

            String file_data = (args.length >= 1 && args[1] != null) ? args[1] : "test.json";
            File file_data_cnt = new File(file_data);
            String data = FileUtils.readFileToString(file_data_cnt, "UTF-8");
            JSONArray data_lines = new JSONArray(data);

            Set<InputDataNode> inputs = dmnModel.getInputs();

            for (int i = 0; i < data_lines.length(); i++) {
                DMNContext dmnContext = dmnRuntime.newContext();


                JSONObject item = data_lines.getJSONObject(i);
                //log.info("source:" + item.toString());

                inputs.forEach(inp -> {
                    //log.info("inp:" + inp.toString());
                    String inp_name = inp.getName();
                    if (item.has(inp_name)) {

                        Object inp_value = item.get(inp_name);

                        if (inp_value instanceof JSONObject) {
                            Map<String, Object> mapValue = jsonToMap((JSONObject) inp_value);
                            dmnContext.set(inp_name, mapValue);
                        } else {
                            dmnContext.set(inp_name, inp_value);
                        }

                        //dmnContext.set(inp_name, item.get(inp_name));
                    }
                });

                String s = "test";

                DMNResult dmnResult = dmnRuntime.evaluateAll(dmnModel, dmnContext);

                for (DMNDecisionResult dr : dmnResult.getDecisionResults()) {
                    item.put(dr.getDecisionName(), dr.getResult());
                }

                if(dmnResult.getMessages()!=null && !dmnResult.getMessages().isEmpty()) {
                    JSONArray dmn_extra = new JSONArray();
                    dmnResult.getMessages().forEach(one -> {
                        dmn_extra.put(one.getText());
                    });
                    item.put("dmn_meta", dmn_extra);
                }

                result.getJSONArray("data").put(item);
            }

        } catch (Exception e) {
            result.put("status", false);
            String error = e.getMessage();
            result.put("error", error);

            String regex = "text=(.*?)\\s*\\]";
            Pattern pattern = Pattern.compile(regex);
            Matcher matcher = pattern.matcher(error);
            if (matcher.find()) {
                result.put("error", matcher.group(1));
            }
        }

        //log.info("result: " + result.toString());
        String file_result = (args.length > 2 && args[2] != null) ? args[2] : "result.json";
        File resultFile = new File(file_result);
        FileUtils.writeStringToFile(resultFile, result.toString(), "UTF-8");

    }


    public static DMNRuntime typeSafeGetKieRuntime(final KieContainer kieContainer) {
        DMNRuntime dmnRuntime = kieContainer.newKieSession().getKieRuntime(DMNRuntime.class);
        ((DMNRuntimeImpl) dmnRuntime).setOption(new RuntimeTypeCheckOption(true));
        return dmnRuntime;
    }

    private static Map<String, Object> jsonToMap(JSONObject jsonObject) {
        Map<String, Object> map = new HashMap<>();

        for (String key : jsonObject.keySet()) {
            Object value = jsonObject.get(key);

            if (value instanceof JSONObject) {
                value = jsonToMap((JSONObject) value);
            }

            map.put(key, value);
        }

        return map;
    }
}