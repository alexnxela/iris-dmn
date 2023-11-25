function convertCsvToHtmlAndJson(csvData) {
    csvData = csvData.replace(/\r\n/g, '\n');
    var rows = csvData.split('\n');

    if (rows.length <= 0) {
        return {table:'', json:[]};
    }

    var table = '<thead><tr>';
    var json_keys = [];
    var json = [];

    var regex = /(\w+)\s+(\w+)(?:\((\d+)\))?/g;
    var match;
    var i = 0;
    while ((match = regex.exec(rows[0])) !== null) {
        var fieldName = match[1];
        var fieldType = match[2];

        json_keys[i] = {name: fieldName, type: fieldType};
        i++;

        table += '<th>' + fieldName + ' ('+ fieldType +')</th>';
    }

    table += '</tr></thead><tbody>';

    for (var i = 1; i < rows.length; i++) {
        if (rows[i].length <= 0) {
            continue;
        }
        var cells = rows[i].split('\t');
        var json_row = {};
        table += '<tr>';
        cells.forEach(function(cell, j) {
            var json_val = cell;
            if (json_keys[j].type === 'INTEGER') {
                json_val = parseInt(cell);
            } else if (json_keys[j].type === 'DECIMAL' || json_keys[j].type === 'DOUBLE') {
                json_val = parseFloat(cell);
            }
            json_row[json_keys[j].name] = json_val;
            table += '<td>' + cell + '</td>';
        });
        json.push(json_row);
        table += '</tr>';
    }

    table += '</tbody>';

    return {table:table, json:json};
}

function getUUIDv4 () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function bootstrapToast(msg) {
    let t_tpl = $('.toast-tpl').html();
    let t = $(t_tpl);
    t.find('.toast-body').html(msg);
    $('.toasts').append(t);
    let toast = new bootstrap.Toast(t, { delay: 10000 });
    toast.show();
}