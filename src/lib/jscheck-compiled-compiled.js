// jscheck.js
// Douglas Crockford
// 2015-05-03

// Public Domain

// http://www.jscheck.org/

/*global clearTimeout, setTimeout*/

/*jslint for */

/*property
 any, apply, args, array, boolean, call, charAt, charCodeAt, character,
 check, claim, classification, classifier, clear, concat, detail, exception,
 fail, falsy, floor, forEach, fromCharCode, group, integer, isArray, join,
 keys, length, literal, lost, map, name, number, object, ok, on_fail,
 on_lost, on_pass, on_report, on_result, one_of, pass, predicate, prototype,
 push, random, reduce, replace, reps, resolve, sequence, serial, signature,
 slice, sort, string, stringify, test, total, verdict
 */

'use strict';

var JSC = (function () {
    'use strict';

    var all,

    // The collection of all claims
    _any,

    // The generator of any value,
    bottom = [false, null, undefined, '', 0, NaN],
        _detail = 3,

    // The current level of report detail
    groups,

    // The collection of named groups of claims
    integer_prime = 1,
        integer_sq_2 = 9,
        integer_sqrt = 1,
        now_group,

    // The current group
    _on_fail,

    // The function that receives the fail cases
    _on_lost,

    // The function that receives the lost cases
    _on_pass,

    // The function that receives the pass cases
    _on_report,

    // The function that receives the reportage
    _on_result,

    // The function that receives the summary
    reject = {},
        _reps = 100,

    // The number of cases to be tried per claim
    slice = Array.prototype.slice,
        unique,

    // Case serial number

    resolve = function resolve(value) {

        // The resolve function takes a value. If that value is a function, then
        // it is called to produce the return value.

        return typeof value === 'function' ? value.apply(null, slice.call(arguments, 1)) : value;
    },
        _integer = function _integer(value, default_value) {
        value = resolve(value);
        return typeof value === 'number' ? Math.floor(value) : typeof value === 'string' ? value.charCodeAt(0) : default_value;
    },
        go = function go(func, value) {

        // If value is truthy, then pass it to the func, ignoring any exceptions,
        // especially if func is not actually a function.

        if (value) {
            try {
                return func(value);
            } catch (ignore) {}
        }
    },
        jsc = {
        any: function any() {
            return jsc.one_of(_any);
        },
        array: function array(dimension, value) {
            if (Array.isArray(dimension)) {
                return function () {
                    return dimension.map(resolve);
                };
            }
            if (dimension === undefined) {
                dimension = jsc.integer(4);
            }
            if (value === undefined) {
                value = jsc.any();
            }
            return function () {
                var i,
                    n = resolve(dimension),
                    result = [];
                if (typeof n === 'number' && isFinite(n)) {
                    for (i = 0; i < n; i += 1) {
                        result.push(resolve(value, i));
                    }
                }
                return result;
            };
        },
        boolean: function boolean(bias) {

            // A signature can contain a boolean specification. An optional bias parameter
            // can be provided. If the bias is 0.25, then approximately a quarter of the
            // booleans produced will be true.

            if (typeof bias !== 'number') {
                bias = 0.50;
            }
            return function () {
                return Math.random() < bias;
            };
        },
        character: function character(i, j) {
            if (j === undefined) {
                if (i === undefined) {
                    i = 32;
                    j = 127;
                } else {
                    return function () {
                        var value = resolve(i);
                        if (typeof value === 'number') {
                            return String.fromCharCode(_integer(i));
                        }
                        if (typeof value === 'string') {
                            return value.charAt(0);
                        }
                        return '?';
                    };
                }
            }
            var ji = jsc.integer(i, j);
            return function () {
                return String.fromCharCode(ji());
            };
        },
        check: function check(claim, ms) {

            // The check function optionally takes a claim function or the name of a group.
            // The default is to check all claims. It returns the jsc object.
            // The results will be provided to callback functions that are registered
            // with the on_* methods.

            var array,
                cases = {},
                complete = false,
                nr_pending = 0,
                serials = [],
                timeout_id;

            function generate_report() {

                // Go through all of the cases. Identify the lost cases [on_lost]. Summarize
                // the cases [on_result]. Produce a detailed report [on_report].

                var class_fail,
                    class_pass,
                    class_lost,
                    i = 0,
                    lines = '',
                    next_case,
                    now_claim,
                    nr_class = 0,
                    nr_fail,
                    nr_lost,
                    nr_pass,
                    report = '',
                    the_case,
                    the_class,
                    total_fail = 0,
                    total_lost = 0,
                    total_pass = 0;

                function generate_line(type, level) {
                    if (_detail >= level) {
                        lines += ' ' + type + ' [' + the_case.serial + '] ' + the_case.classification + JSON.stringify(the_case.args).replace(/^\[/, '(').replace(/\]$/, ')') + '\n';
                    }
                }

                function generate_class(key) {
                    if (_detail >= 3 || class_fail[key] || class_lost[key]) {
                        report += ' ' + key + ' pass ' + class_pass[key] + (class_fail[key] ? ' fail ' + class_fail[key] : '') + (class_lost[key] ? ' lost ' + class_lost[key] : '') + '\n';
                    }
                }

                if (cases) {
                    if (timeout_id) {
                        clearTimeout(timeout_id);
                    }
                    while (true) {
                        next_case = cases[serials[i]];
                        if (!next_case || next_case.claim !== now_claim) {
                            if (now_claim) {
                                if (_detail >= 1) {
                                    report += the_case.name + ': ' + (nr_class ? nr_class + ' classifications, ' : '') + (nr_pass + nr_fail + nr_lost) + ' cases tested, ' + nr_pass + ' pass' + (nr_fail ? ', ' + nr_fail + ' fail' : '') + (nr_lost ? ', ' + nr_lost + ' lost' : '') + '\n';
                                    if (_detail >= 2) {
                                        Object.keys(class_pass).sort().forEach(generate_class);
                                        report += lines;
                                    }
                                }
                                total_fail += nr_fail;
                                total_lost += nr_lost;
                                total_pass += nr_pass;
                            }
                            if (!next_case) {
                                break;
                            }
                            nr_fail = 0;
                            nr_lost = 0;
                            nr_pass = 0;
                            class_pass = {};
                            class_fail = {};
                            class_lost = {};
                            lines = '';
                        }
                        the_case = next_case;
                        i += 1;
                        now_claim = the_case.claim;
                        the_class = the_case.classification;
                        if (the_class && typeof class_pass[the_class] !== 'number') {
                            class_pass[the_class] = 0;
                            class_fail[the_class] = 0;
                            class_lost[the_class] = 0;
                            nr_class += 1;
                        }
                        switch (the_case.pass) {
                            case true:
                                if (the_class) {
                                    class_pass[the_class] += 1;
                                }
                                if (_detail >= 4) {
                                    generate_line('Pass', 4);
                                }
                                nr_pass += 1;
                                break;
                            case false:
                                if (the_class) {
                                    class_fail[the_class] += 1;
                                }
                                generate_line('FAIL', 2);
                                nr_fail += 1;
                                break;
                            default:
                                if (the_class) {
                                    class_lost[the_class] += 1;
                                }
                                generate_line('LOST', 2);
                                nr_lost += 1;
                                go(_on_lost, the_case);
                        }
                    }
                    if (typeof claim === 'string' && _detail >= 1) {
                        report = 'Group ' + claim + '\n\n' + report;
                    }
                    report += '\nTotal pass ' + total_pass + (total_fail ? ', fail ' + total_fail : '') + (total_lost ? ', lost ' + total_lost : '') + '\n';
                    go(_on_result, {
                        pass: total_pass,
                        fail: total_fail,
                        lost: total_lost,
                        total: total_pass + total_fail + total_lost,
                        ok: total_lost === 0 && total_fail === 0 && total_pass > 0
                    });
                    go(_on_report, report);
                }
                cases = null;
            }

            function register(serial, value) {

                // This function is used by a claim function to register a new case, and it
                // is used by a case to report a verdict. The two uses are correlated by the
                // serial number.

                // If the cases object is gone, then late arriving lost result should be
                // ignored.

                var the_case;
                if (cases) {
                    the_case = cases[serial];

                    // If the serial number has not been seen, then register a new case.
                    // The case is added to the cases collection. The serial number is added to
                    // the serials collection. The number of pending cases is increased.

                    if (the_case === undefined) {
                        cases[serial] = value;
                        serials.push(serial);
                        nr_pending += 1;
                    } else {

                        // An existing case now gets its verdict. If it unexpectedly already has a
                        // result, then throw an exception. Each case should have only one result.

                        if (the_case.pass !== undefined) {
                            throw the_case;
                        }

                        // If the result is a boolean, then the case is updated and sent to on_pass
                        // or on_fail.

                        if (value === true) {
                            the_case.pass = true;
                            go(_on_pass, the_case);
                        } else if (value === false) {
                            the_case.pass = false;
                            go(_on_fail, the_case);
                        } else {

                            // Any other result indicates that the case was lost. Assume that the value
                            // is an exception object.

                            the_case.pass = null;
                            the_case.exception = value;
                        }

                        // This case is no longer pending. If all of the cases have been generated and
                        // given results, then generate the result.

                        nr_pending -= 1;
                        if (nr_pending <= 0 && complete) {
                            generate_report();
                        }
                    }
                }
                return value;
            }

            // Make an array of the claims to be checked.

            if (typeof claim === 'function') {
                array = [claim];
            } else if (typeof claim === 'string') {
                array = groups[claim];
                if (!Array.isArray(array)) {
                    throw new Error('Bad group ' + claim);
                }
            } else {
                array = all;
                ms = ms || claim;
            }
            unique = 0;

            // Process each claim.

            array.forEach(function (claim) {
                var at_most = _reps * 10,
                    counter = 0,
                    i;
                integer_sq_2 = 9;
                integer_sqrt = 1;
                integer_prime = 1;

                // Loop over the generation and testing of cases.

                for (i = 0; counter < _reps && i < at_most; i += 1) {
                    if (claim(register) !== reject) {
                        counter += 1;
                    }
                }
            });

            // All of the case predicates have been called.

            complete = true;

            // If all of the cases have returned verdicts, then generate the report.

            if (nr_pending <= 0) {
                generate_report();

                // Otherwise, start the timer.
            } else if (ms > 0) {
                timeout_id = setTimeout(generate_report, ms);
            }
            return jsc;
        },
        claim: function claim(name, predicate, signature, classifier, dont) {

            // A claim consists of
            //  a unique name which is displayed in the the report,
            //  a predicate function which exercises the claim, and that will return true
            //      if the claim holds,
            //  a function signature for the function expressed as an array of type
            //      specifiers or expressions,
            //  an optional classifier function, which takes the same arguments as the
            //      property function, and returns a string for classifying the subsets, or
            //      false if the predicate should not be given this set of generated
            //      arguments.

            // A function is returned, which can be called by the check function.
            // That function will also be deposited in the set of all claims.
            // If a group name has been set, then the claim will also be deposited
            // in the group.

            var group = now_group;
            if (!Array.isArray(signature)) {
                signature = [signature];
            }

            function claim(register) {
                var args = signature.map(function (value) {
                    return resolve(value);
                }),
                    classification = '',
                    serial,
                    verdict;

                // If an classifier function was provided, then call it to obtain a
                // classification. If the classification is not a string, then reject the
                // case.

                if (typeof classifier === 'function') {
                    classification = classifier.apply(args, args);
                    if (typeof classification !== 'string') {
                        return reject;
                    }
                }

                // Create a unique serial number for this case.

                unique += 1;
                serial = unique;

                // Create a verdict function that wraps the register function.

                verdict = function (result) {
                    if (result === undefined) {
                        result = null;
                    }
                    return register(serial, result);
                };

                // Register an object that represents this case.

                register(serial, {
                    args: args,
                    claim: claim,
                    classification: classification,
                    classifier: classifier,
                    group: group,
                    name: name,
                    pass: undefined,
                    predicate: predicate,
                    serial: serial,
                    signature: signature,
                    verdict: verdict
                });

                // Call the predicate, giving it the verdict function and all of the case's
                // arguments. The predicate must use the verdict callback to signal the result
                // of the case.

                try {
                    return predicate.apply(args, [verdict].concat(args));

                    // If the predicate throws, then this is a lost case. Use the exception
                    // as the verdict, but don't allow the exception to be a boolean, because that
                    // would be confusing.
                } catch (e) {
                    return verdict(typeof e === 'boolean' ? null : e);
                }
            }
            if (dont !== true) {

                // If there is a group active, then add this claim to the group.
                // (See the group method.)

                if (group) {
                    if (!Array.isArray(groups[group])) {
                        groups[group] = [claim];
                    } else {
                        groups[group].push(claim);
                    }
                }

                // Add this claim to the set of all claims.

                all.push(claim);
            }
            return claim;
        },
        clear: function clear() {
            all = [];
            groups = {};
            now_group = '';
            return jsc;
        },
        detail: function detail(level) {
            _detail = level;
            return jsc;
        },
        falsy: function falsy() {
            return jsc.one_of(bottom);
        },
        group: function group(name) {
            now_group = name || '';
            return jsc;
        },
        integer: function integer(i, j) {
            if (i === undefined) {
                return function () {
                    var exclude, factor;
                    do {
                        integer_prime += 2;
                        exclude = false;
                        if (integer_prime >= integer_sq_2) {
                            exclude = true;
                            integer_sqrt += 2;
                            integer_sq_2 = (integer_sqrt + 2) * (integer_sqrt + 2);
                        }
                        for (factor = 3; !exclude && factor <= integer_sqrt; factor += 2) {
                            exclude = integer_prime % factor === 0;
                        }
                    } while (exclude);
                    return integer_prime;
                };
            }
            i = _integer(i, 1);
            j = _integer(j, 1);
            if (j === undefined) {
                j = i;
                i = 1;
            }
            if (i === j) {
                return i;
            }
            if (i > j) {
                var t = i;
                i = j;
                j = t;
            }
            return function () {
                return Math.floor(Math.random() * (j + 1 - i) + i);
            };
        },
        literal: function literal(value) {
            return function () {
                return value;
            };
        },
        number: function number(i, j) {
            i = +i || 0;
            j = +j;
            if (!isFinite(j)) {
                j = i || 1;
                i = 0;
            }
            if (i === j) {
                return i;
            }
            if (i > j) {
                var t = i;
                i = j;
                j = t;
            }
            return function () {
                return Math.random() * (j - i) + i;
            };
        },
        object: function object(_object, value) {
            if (_object === undefined) {
                _object = jsc.integer(1, 4);
            }
            return function () {
                var gen,
                    i,
                    keys,
                    result = {},
                    string,
                    values;
                keys = resolve(_object);
                if (typeof keys === 'number') {
                    string = jsc.string();
                    gen = jsc.any();
                    for (i = 0; i < keys; i += 1) {
                        result[string()] = gen();
                    }
                    return result;
                }
                if (value === undefined) {
                    if (keys && typeof keys === 'object') {
                        Object.keys(_object).forEach(function (key) {
                            result[key] = resolve(keys[key]);
                        });
                        return result;
                    }
                } else {
                    values = resolve(value);
                    if (Array.isArray(keys)) {
                        keys.forEach(function (key, i) {
                            result[key] = resolve(Array.isArray(values) ? values[i % values.length] : value, i);
                        });
                        return result;
                    }
                }
                return null;
            };
        },
        one_of: function one_of(array, weights) {

            // The one_of specifier has two signatures.

            //  one_of(array)
            //      One element is taken from the array and resolved. The elements are
            //      selected randomly with equal probabilities.

            // one_of(array, weights)
            //      The two arguments are both arrays with equal lengths. The larger
            //      a weight, the more likely an element will be selected.

            if (typeof array === 'string') {
                return function () {
                    return array.charAt(Math.floor(Math.random() * array.length));
                };
            }
            if (Array.isArray(array) && array.length > 0) {
                if (!Array.isArray(weights)) {
                    return function () {
                        return resolve(array[Math.floor(Math.random() * array.length)]);
                    };
                }
                if (array.length === weights.length) {
                    var base = 0,
                        n = array.length - 1,
                        total = weights.reduce(function (a, b) {
                        return a + b;
                    }, 0),
                        list = weights.map(function (value) {
                        base += value / total;
                        return base;
                    });
                    return function () {
                        var i,
                            x = Math.random();
                        for (i = 0; i < n; i += 1) {
                            if (x < list[i]) {
                                return resolve(array[i]);
                            }
                        }
                        return resolve(array[n]);
                    };
                }
            }
            return null;
        },
        on_fail: function on_fail(func) {
            _on_fail = func;
            return jsc;
        },
        on_lost: function on_lost(func) {
            _on_lost = func;
            return jsc;
        },
        on_pass: function on_pass(func) {
            _on_pass = func;
            return jsc;
        },
        on_report: function on_report(func) {
            _on_report = func;
            return jsc;
        },
        on_result: function on_result(func) {
            _on_result = func;
            return jsc;
        },
        reps: function reps(number) {
            _reps = number;
            return jsc;
        },
        resolve: resolve,
        sequence: function sequence(seq) {
            if (seq === undefined) {
                return function () {
                    return unique + 1;
                };
            }
            var array = arguments.length > 1 ? slice.call(arguments, 0) : seq,
                i = -1;
            return function () {
                i += 1;
                if (i >= array.length) {
                    i = 0;
                }
                return resolve(array[i]);
            };
        },
        string: function string(_x) {
            var _arguments = arguments;
            var _again = true;

            _function: while (_again) {
                var value = _x;
                i = length = pieces = undefined;

                var pair = function pair(dimension, value) {
                    if (i + 1 === length) {
                        return function () {
                            return JSON.stringify(resolve(dimension));
                        };
                    }
                    var ja = jsc.array(dimension, value);
                    return function () {
                        return ja().join('');
                    };
                };

                _again = false;

                var i,
                    length = _arguments.length,
                    pieces = [];

                if (value === undefined || typeof value === 'boolean') {
                    _arguments = [_x = jsc.integer(10), jsc.character(value)];
                    _again = true;
                    continue _function;
                }

                for (i = 0; i < length; i += 2) {
                    pieces.push(pair(_arguments[i], _arguments[i + 1]));
                }
                return function () {
                    return pieces.map(resolve).join('');
                };
            }
        },
        test: function test(name, predicate, signature, classifier, ms) {
            return JSC.check(JSC.claim(name, predicate, signature, classifier, true), ms);
        }
    };
    _any = [jsc.falsy(), jsc.integer(), jsc.number(), jsc.string(), true, Infinity, -Infinity];
    return jsc.clear();
})();

//# sourceMappingURL=jscheck-compiled.js.map

//# sourceMappingURL=jscheck-compiled-compiled.js.map