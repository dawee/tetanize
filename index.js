var mdeps = require('module-deps');
var through = require('through');
var mustache = require('mustache');
var fs = require('fs');
var path = require('path');

exports.build = function (options, cb) {
    var globule = new Globule(options);

    globule.build(cb);
};

function Globule(options) {
    this.main = options.main;
}

function normalize(id) {
    return path.relative('.', id).replace(/^node_modules\//, '').replace(/\.js$/, '');
}

function replaceRequires(mod) {
    Object.keys(mod.deps).forEach(function (call) {
        if (typeof mod.deps[call] === 'string') {
            var id = normalize(mod.deps[call]);

            mod.source = mod.source.replace(new RegExp('[\'\"]{1}' + call + '[\'\"]{1}'), '\'' + id + '\'');
        }
    });

    return mod.source;
}

function indent(source) {
    var indented = '';

    source.split('\n').forEach(function (line) {
        indented += '  ' + line + '\n';
    });

    return indented;
}

Globule.prototype.build = function (cb) {
    var that = this;
    var stream = mdeps(path.resolve(this.main), {filter: function (id) {
        if (id.match(/^[a-z]+$/)) {
            var isNative = false;

            try {
                isNative = (require.resolve(id) === id)
            } catch(e) {
                console.log(id, 'is not native');
                isNative = false;
            }

            return !isNative;
        }
        return true;
    }});

    this.modules = [];

    stream.pipe(through(
        function (mod) {
            that.addModule(mod);
        },
        function () {
            cb(mustache.render(
                fs.readFileSync(
                    __dirname + '/globule.mustache'
                ).toString(),
                {modules: that.modules, main: normalize(that.main)}
            ));
        }
    ));

};

Globule.prototype.addModule = function (mod) {
    this.modules.push({id: normalize(mod.id), source: indent(replaceRequires(mod)), deps: mod.deps});
};