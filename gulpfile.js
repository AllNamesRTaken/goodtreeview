var gulp = require("gulp");

gulp.task("package", gulp.series("bump", function() {
    return gulp.src(["./package.json", "./README.md"])
        .pipe(gulp.dest("dist/lib"));
}));