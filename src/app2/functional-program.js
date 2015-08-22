
var map = R.curry(function (f, container) {
    return container.map(f);
});

var chain = R.curry(function (f, container) {
    return container.chain(f);
});

var lift = R.curry(function (f, value) {
    return Maybe.fromNullable(value).map(f);
});

var liftIO = function (value) {
    return IO.of(value);
};

var appendToTable = function (elementId) {
    return function (row) {
        $('#' + elementId + ' tr:last').after(row);
        return $('#' + elementId + ' tr').length - 1; // exclude header
    };
};

var debugLog = _.partial(logger, 'console', 'basic', 'IO Monad Example', 'TRACE');

var trace = R.curry(function (msg, obj) {debugLog(msg + ':' + obj);});

var trim = function (str) {
    return str.replace(/^\s*|\s*$/g, '');
};

var normalize = function (str) {
    return str.replace(/\-/g, '');
};

var m_normalize = normalize.memoize();
var m_trim = trim.memoize();

var cleanInput = R.compose(R.tap(trace), m_normalize, R.tap(trace), m_trim);
var m_cleanInput = cleanInput.memoize();

var populateRow = function (columns) {
    var cell_t = _.template('<td><%= a %></td>');
    var row_t  = _.template('<tr><%= a %></tr>');
    var obj = function(a) {
        return {'a': a};
    };
    var row = R.compose(row_t, obj, R.join(''), R.map(cell_t), R.map(obj));
    return row(columns);
};


// fetchStudentHttp :: URI , String -> Promise
var fetchStudentHttp = R.curry(function (uri, studentId) {
    const path = uri + '/student?id =' + studentId;
    return Promise.resolve(path);
});

var validLength = function(len, str) {
    return str.length === len;
};
var m_validLength9 = validLength.bind(undefined, 9).memoize();

var checkLengthSsn = function (str) {
    return Either.of(str).filter(m_validLength9)
        .getOrElseThrow('Input: ' + str + ' is not a valid SSN number');
};
const HOST = 'http://localhost:8000';
var findStudent = fetchStudentHttp(HOST);

var m_checkLengthSsn = checkLengthSsn.memoize();
var m_findStudent = findStudent.memoize();

// Alternate implementation
var addToRoster = R.compose(
    map(appendToTable('studentRoster')),
    liftIO,
    chain(populateRow),
    map(R.props(['ssn', 'firstname', 'lastname'])),
    map(m_findStudent),
    map(m_checkLengthSsn),
    lift(m_cleanInput));
