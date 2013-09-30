var mdeps = require('module-deps');
var through = require('through');
var mustache = require('mustache');
var fs = require('fs');
var path = require('path');

exports.build = function (options, cb) {
    var tetanize = new Tetanizer(options);

    tetanize.build(cb);
};

function Tetanizer(options) {
    this.main = options.main;
    this.path = options.path;
}

Tetanizer.prototype.normalize = function (id) {
    return path.relative(this.path, id).replace(/^node_modules\//, '').replace(/\.js$/, '');
};

Tetanizer.prototype.replaceRequires = function (mod) {
    var that = this;

    Object.keys(mod.deps).forEach(function (call) {
        if (typeof mod.deps[call] === 'string') {
            var id = that.normalize(mod.deps[call]);

            mod.source = mod.source.replace(new RegExp('[\'\"]{1}' + call + '[\'\"]{1}'), '\'' + id + '\'');
        }
    });

    return mod.source;
};

Tetanizer.prototype.indent = function (source) {
    var indented = '';

    source.split('\n').forEach(function (line) {
        indented += '  ' + line + '\n';
    });

    return indented;
};

Tetanizer.prototype.build = function (cb) {
    var that = this;
    var stream = mdeps(path.resolve(this.path + '/' + this.main), {filter: function (id) {
        if (id.match(/^[a-z]+$/)) {
            var isNative = false;

            try {
                isNative = (require.resolve(id) === id)
            } catch(e) {
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
                    __dirname + '/tetanize.mustache'
                ).toString(),
                {modules: that.modules, main: that.normalize(that.main)}
            ));
        }
    ));

};

Tetanizer.prototype.addModule = function (mod) {
    this.modules.push({
        id: this.normalize(mod.id),
        source: this.indent(this.replaceRequires(mod)),
        deps: mod.deps
    });
};