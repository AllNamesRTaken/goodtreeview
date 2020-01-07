var gulp = require("gulp");
var fs = require("fs");

var package = require("./package.json");
var version = package.version.split(".").map((v) => parseInt(v) || 0);

gulp.task("bump", gulp.parallel(function(cb) {
    version[2]++;
    package.version = version.join(".");
    fs.writeFileSync("./package.json", JSON.stringify(package, null, 2), { encoding: "utf8" });
    cb();
}));

gulp.task("package", gulp.series("bump", function() {
    return gulp.src(["./package.json", "./README.md"])
        .pipe(gulp.dest("dist"));
}));
