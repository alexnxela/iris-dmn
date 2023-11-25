$(function() {

    let $dmn_results_btn = $('.dmn-results-btn');
    let $dmn_results = $('.dmn-results');
    let $dmn_sql_hint = $('.dmn-sql-hint');
    let $dmn_sql_loader = $('.dmn-sql-loader');
    let $dmn_sql_btn_run = $('.dmn-sql-btn-run');
    let $dmn_sql_results_btn = $('.dmn-sql-results-btn');
    let $dmn_sql_results = $('.dmn-sql-results');
    let $dmn_sql_history_btn = $('.dmn-sql-history-btn');
    let $dmn_sql_histroy = $('.dmn-sql-history');
    let $dmn_sql_histroy_ul = $dmn_sql_histroy.find('ul');
    let $dmn_run_btn = $('.dmn-run-btn');
    let $dmn_upload_sample_file_btn = $('.dmn-upload-sample-file-btn');
    let $dmn_file_results_btn = $('.dmn-file-results-btn');
    let $dmn_file_results = $('.dmn-file-results');
    let $dmn_save_btn = $('.dmn-save-btn');

    let $dmn_modal_upload_file = $('#dmn-modal-upload-file');
    let $dmn_modal_upload_file_open_btn = $('.dmn-modal-upload-file-open-btn');
    let $dmn_upload_file_btn = $('.dmn-upload-file-btn');
    let $dmn_download_file_btn = $('.dmn-download-file-btn');

    $dmn_upload_sample_file_btn.click(function (e) {
        fetch('/dmn/sample.dmn')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error with get sample.dmn file');
                }

                return response.text();
            }).then(data => {
                window.dmn_editor.setContent("", data);
            })
            .catch(error => {
                console.error('Unknown error', error);
            });
    });

    // download dmn file section
    $dmn_download_file_btn.click(function (e) {
        window.dmn_editor.getContent().then(content => {
            const elem = window.document.createElement("a");
            elem.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
            let date_time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, '-');
            elem.download = "model_"+date_time+".dmn";
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
            window.dmn_editor.markAsSaved();
        });
    });

    $dmn_save_btn.click(function (e) {
        window.dmn_editor.getContent().then(content => {
            window.localStorage.setItem('dmn', content);
            window.dmn_editor.markAsSaved();
            bootstrapToast('DMN saved');
        });
    });

    // upload DMN file section
    $dmn_modal_upload_file_open_btn.click(function (e) {
        e.preventDefault();
        $dmn_modal_upload_file.modal('show');
    });

    $dmn_upload_file_btn.click(function () {
        var file_input = $dmn_modal_upload_file.find('.dmn-file-upload')[0];
        var file = file_input.files[0];

        if (file) {
            console.log(file);

            var reader = new FileReader();
            reader.onload = function (e) {
                window.dmn_editor.setContent("", e.target.result);
                $dmn_modal_upload_file.val('');
            };
            reader.readAsText(file);
            $dmn_modal_upload_file.modal("hide");
        } else {
            alert('Choose file for upload');
        }
    });

    // init dmn editor
    let preloadDmn = new Promise(function(resolve, reject) {
        let dmn = window.localStorage.getItem('dmn');
        if (dmn) {
            resolve(dmn);
        }
        resolve('');
    });

    window.dmn_editor = DmnEditor.open({
        container: document.getElementById("dmn-editor-container"),
        initialContent: preloadDmn,
        readOnly: false,
        keyboard: {
            bindTo: window
        },
        origin: "*"
    });

    // init sql editor
    window.editor = ace.edit("editor");
    ace.require("ace/ext/language_tools");
    window.editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true
    });

    window.editor.setTheme("ace/theme/tomorrow");
    window.editor.session.setMode("ace/mode/sql");
    window.editor.commands.addCommand({
        name: 'save',
        bindKey: {win: "Ctrl-Enter", "mac": "Cmd-Enter"},
        exec: (editor) => {
            window.editor_save(editor);
        }
    });

    // set default data
    editor_content_data = window.localStorage.getItem('editor_content_data');
    if (!editor_content_data) {
        editor_content_data = $('#editor').next().html();
    }
    window.editor.setValue(editor_content_data, 1);

    // handle sql editor save btn
    window.editor_save = function (editor) {
        $dmn_sql_btn_run.addClass('disabled');

        $dmn_sql_results_btn.click();

        window.localStorage.setItem('editor_content_data', editor.getValue());

        let s = editor.getSelectedText();
        if (s.length === 0) {
            s = editor.getValue();
        }

        $dmn_sql_loader.removeClass('d-none');
        $dmn_sql_hint.addClass('d-none');
        $.ajax({
            type: "POST",
            url: "/dmn-api/sql",
            data: JSON.stringify({"sql":s, "type":"CSV"}),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(data) {
                let queries = window.localStorage.getItem('editor_history') || '[]';
                    queries = JSON.parse(queries);
                    queries.push(s);
                    window.localStorage.setItem('editor_history', JSON.stringify(queries));

                let dmn_results = $('.dmn-sql-results');
                    dmn_results.empty();
                    dmn_results.removeClass('p-4');

                if (data.status === 'ok') {
                    dmn_results.addClass('p-0');
                    let cnt = data.data;

                    if (cnt.length === 0) {
                        cnt = '<div class="p-4">ok</div>';
                    } else {
                        let d = convertCsvToHtmlAndJson(cnt);
                        window.dmn_last_sql_result = d.json;
                        cnt = '<table class="table table-bordered table-striped">' + d.table + '</table>';
                    }

                    //let iframe = $('<iframe frameborder="0" scrolling="no"></iframe>');
                    //iframe.attr('srcdoc', table);
                    dmn_results.append(cnt);
                } else {
                    dmn_results.empty();
                    dmn_results.addClass('p-2');
                    let error = 'Unknown error';
                    if (data.error) {
                        error = data.error;
                    }
                    dmn_results.append('<div class="alert alert-danger" role="alert">'+error+'</div>');
                }
            },
            failure: function(err) {
                console.log(err);
            }
        }).done(function() {
            setTimeout(function() {
                $dmn_sql_loader.addClass('d-none');
                $dmn_sql_hint.removeClass('d-none');
            }, 100);
            $dmn_sql_btn_run.removeClass('disabled');
            window.editor_sql_history_update();
        });
    }

    // handle sql editor run btn
    $dmn_sql_btn_run.click(function(e) {
        e.preventDefault();
        window.editor_save(window.editor);
        return false;
    });

    // handle sql editor history btn
    $dmn_sql_history_btn.click(function(e) {
        e.preventDefault();
        let o = $(this);
        let card = o.closest('.card');
            card.find('.card-body').addClass('d-none')
            card.find('.card-header li a').removeClass('active');

        o.addClass('active');
        $dmn_sql_histroy.removeClass('d-none');
        return false;
    });

    // handle sql editor results btn
    $dmn_sql_results_btn.click(function(e) {
        e.preventDefault();
        let o = $(this);
        let card = o.closest('.card');
        card.find('.card-body').addClass('d-none')
        card.find('.card-header li a').removeClass('active');

        o.addClass('active');
        $dmn_sql_results.removeClass('d-none');
        return false;
    });

    // handle dmn results btn
    $dmn_results_btn.click(function(e) {
        e.preventDefault();
        let o = $(this);
        let card = o.closest('.card');
        card.find('.card-body').addClass('d-none')
        card.find('.card-header li a').removeClass('active');

        o.addClass('active');
        $dmn_results.removeClass('d-none');
        return false;
    });

    // handle dmn file results btn
    $dmn_file_results_btn.click(function(e) {
        e.preventDefault();
        let o = $(this);
        let card = o.closest('.card');
        card.find('.card-body').addClass('d-none')
        card.find('.card-header li a').removeClass('active');

        o.addClass('active');
        $dmn_file_results.removeClass('d-none');
        return false;
    });

    $dmn_run_btn.click(function(e) {
        e.preventDefault();
        $dmn_results_btn.click();

        $dmn_results.empty();

        if (!window.dmn_last_sql_result) {
            $dmn_results.append('<div class="alert alert-danger" role="alert">Sql results are empty</div>');
            return;
        }

        window.dmn_editor.getContent().then(content => {
            let file_name_dmn = getUUIDv4() + '.dmn';
            window.dmn_api_upload(file_name_dmn, content, function (data) {
                $dmn_results.append('<div>dmn file uploaded (<a href="#" class="file-download">'+file_name_dmn+'</a>) <i class="fa fa-download" aria-hidden="true"></i></div>');
                let file_name_data = getUUIDv4() + '.json';
                window.dmn_api_upload(file_name_data, JSON.stringify(window.dmn_last_sql_result || []), function (data) {
                    $dmn_results.append('<div>json data file uploaded (<a href="#" class="file-download">'+file_name_data+'</a>) <i class="fa fa-download" aria-hidden="true"></i></div>');
                    $dmn_results.append('<div>execute dmn..</div>');
                    $.ajax({
                        type: "POST",
                        url: "/dmn-api/execute",
                        data: JSON.stringify({dmn:file_name_dmn, data:file_name_data}),
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        success: function(data) {
                            if (data.status === 'ok') {
                                $dmn_results.append('<div>dmn log file (<a href="#" class="file-download">'+data.log+'</a>) <i class="fa fa-download" aria-hidden="true"></i></div>');
                                $dmn_results.append('<div>dmn result file (<a href="#" class="file-download">'+data.result+'</a>) <i class="fa fa-download" aria-hidden="true"></i></div>');
                                $dmn_results.append('<div>end..</div>');
                            } else {
                                let error = 'Unknown error';
                                if (data.error) {
                                    error = data.error;
                                }
                                $dmn_results.append('<div class="alert alert-danger" role="alert">'+error+'</div>');
                            }
                        },
                        failure: function(err) {
                            console.log(err);
                        }
                    });
                });
            });
        });
    });

    $dmn_results.on('click', '.fa-download', function (e) {
        e.preventDefault();
        let o = $(this);
        let file_name = o.parent().find('a').text();

        window.dmn_api_download(file_name, function (data) {
            if (data.status === 'ok') {
                const elem = window.document.createElement("a");
                elem.href = "data:text/plain;charset=utf-8," + encodeURIComponent(data.data);
                let date_time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, '-');
                elem.download = file_name;
                document.body.appendChild(elem);
                elem.click();
                document.body.removeChild(elem);
            } else {
                let error = 'Unknown error';
                if (data.error) {
                    error = data.error;
                }
                alert(error);
            }
        });
    });

    $dmn_results.on('click', '.file-download', function (e) {
        e.preventDefault();
        let o = $(this);
        let file_name = o.text();

        $dmn_file_results.empty();
        $dmn_file_results.append('<div>Downloading file..</div>');
        $dmn_file_results_btn.click();

        window.dmn_api_download(file_name, function (data) {
            if (data.status === 'ok') {
                $dmn_file_results.empty();
                $dmn_file_results.append('<div>File: '+file_name+'</div>');
                let cnt = $('<div style="padding:2px; background: #e1e1e1;"></div>');
                cnt.text(data.data);
                $dmn_file_results.append(cnt);

            } else {
                let error = 'Unknown error';
                if (data.error) {
                    error = data.error;
                }
                $dmn_file_results.append('<div class="alert alert-danger" role="alert">'+error+'</div>');
            }
        });

        return false;
    });

    window.dmn_api_download = function (file_name, cb) {
        $.ajax({
            type: "POST",
            url: "/dmn-api/download",
            data: JSON.stringify({"file":file_name}),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(data) {
                if (cb) {
                    cb(data);
                }
            },
            failure: function(err) {
                console.log(err);
            }
        });
    }

    window.dmn_api_upload = function (file_name, content, cb) {
        $.ajax({
            type: "POST",
            url: "/dmn-api/upload",
            data: JSON.stringify({"file":file_name, "content":content}),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(data) {
                if (data.status === 'ok') {
                    if (cb) {
                        cb(data);
                    }
                } else {
                    let error = 'Unknown error';
                    if (data.error) {
                        error = data.error;
                    }
                    $dmn_results.append('<div class="alert alert-danger" role="alert">'+error+'</div>');
                }
            },
            failure: function(err) {
                console.log(err);
            }
        });
    }

    window.editor_sql_history_update = function () {
        $('.dmn-sql-history ul').empty();
        let queries = window.localStorage.getItem('editor_history') || '[]';
        queries = JSON.parse(queries);
        if (queries) {
            for (let i in queries) {
                let q = queries[i];
                let q_item = $('<li class="list-group-item"></li>');
                q_item.text(q);
                $dmn_sql_histroy_ul.prepend(q_item);
            }
        }
    }
    window.editor_sql_history_update();

});