//定義
const gulp = require('gulp'); //gulp
const rename = require('gulp-rename'); //名前変更
const sass = require('gulp-sass'); //sassコンパイル
const packageImporter = require('node-sass-package-importer'); //cssパッケージのimport用
const postcss = require('gulp-postcss'); //autoprefixerを使うのに必要
const autoprefixer = require('autoprefixer'); //prefixをつける
const cleanCss = require('gulp-clean-css'); //css圧縮
const ejs = require('gulp-ejs'); //ejsコンパイル
const htmlmin = require('gulp-htmlmin'); //html圧縮と整理
const babel = require('gulp-babel'); //jsトランスパイル
const uglify = require('gulp-uglify'); //js圧縮
const eslint = require('eslint'); //js linter
const del = require('del'); //フォルダやファイルを削除
const imagemin = require('gulp-imagemin'); //画像圧縮
const mozjpeg = require('imagemin-mozjpeg') //jpgエンコード
const imageminSvgo = require('imagemin-svgo'); //svgエンコード
const imageminOptipng = require('imagemin-pngquant'); //pngエンコード
const imageminGifsicle = require('imagemin-gifsicle'); //gifエンコード
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const browserSync = require('browser-sync').create(); //ブラウザシンク


//取得元、出力先のパス
const pathOrigin = {
  dest: './dest',
  dev: './src'
}
const paths = {
  html: {
    src: pathOrigin.dev + '/views/*.ejs',
    tempSrc: pathOrigin.dev + '/views/**/_*.ejs',
    dest:  pathOrigin.dest,
    map: '/map',
  },
  styles: {
    src: pathOrigin.dev + '/scss/*.scss',
    tempSrc: pathOrigin.dev + '/scss/**/_*.scss',
    dest: pathOrigin.dest + '/css',
    map: '/map',
    clearmap: pathOrigin.dest + '/css/map',
  },
  scripts: {
    src: pathOrigin.dev + '/js/*.js',
    dest: pathOrigin.dest + '/js',
    map: '/map',
    clearmap: pathOrigin.dest + '/js/map/',
  },
  images: {
    src: pathOrigin.dev + '/assets/*.{jpg,jpeg,png,svg,gif}',
    dest: pathOrigin.dest + '/assets',
  }
}
const srcpathAll = [paths.html.src, paths.html.tempSrc, paths.styles.src, paths.styles.tempSrc, paths.scripts.src, paths.images.src];


//画質コントロール
const imageQuality = {
  jpg: 60,
  png: [0.5, 0.8], //minimum, maximum
  svg: 60,
  gif: 1, //1 or 3, 1 is default
}

// sass
function stylesFunc() {
  return gulp
    .src([paths.styles.src, paths.styles.tempSrc], {sourcemaps: true, since: gulp.lastRun(stylesFunc)})
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(sass())
    .pipe(postcss([ autoprefixer({
      grid: 'autoplace', //gridレイアウトのプレフィックスを有効にする
    }) ]))
    .pipe(cleanCss())
    .pipe(gulp.dest(paths.styles.dest, { sourcemaps: paths.styles.map }));
}

// EJS
function htmlFunc() {
  return gulp
    .src([paths.html.src, '!' + paths.html.tempSrc], {since: gulp.lastRun(htmlFunc)})
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(ejs())
    .pipe(rename({extname:'.html'}))
    .pipe(htmlmin({
      collapseWhitespace : true, //余白を削除
      removeComments : true,　//コメントを削除
      removeRedundantAttributes: true //default値の属性を削除
    }))
    .pipe(gulp.dest(paths.html.dest));
}

// JS
function scriptFunc() {
  return gulp
    .src(paths.scripts.src, { sourcemaps: true, since: gulp.lastRun(scriptFunc)})
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe (gulp.dest(paths.scripts.dest, { sourcemaps: paths.styles.map, since: gulp.lastRun(scriptFunc)}));
}

//画像処理
function imageFunc() {
  return gulp
  .src([paths.images.src], {since: gulp.lastRun(imageFunc)})
    .pipe(imagemin([
      mozjpeg({quality: imageQuality.jpg}),
      imagemin.optipng({quality: imageQuality.png}),
      imagemin.svgo({removeViewBox: false}),
      imagemin.gifsicle({optimizationLevel: imageQuality.gif}),
    ]))
    .pipe(gulp.dest(paths.images.dest));
}

// サーバーを立ち上げる
function destServer(done) {
  browserSync.init({
      server: {
          baseDir: pathOrigin.dest,
          index  : "index.html"
      },
      reloadOnRestart: true,
  });
  done();
}

// ブラウザのリロード
function browserReload(done) {
  browserSync.reload();
  done();
  console.log(('reload done'));
}

function removeFile(path, name) {
  return del(path.replace(/src\/views/, 'dest').replace('ejs', 'html'));
};

// タスクを監視
function watchFiles() {

  gulp.watch(paths.styles.src)
    .on('all', (event, path) => {
      if (event === 'unlink' || event === 'unlinkDir') {
        return del(path.replace(/src\/scss/, paths.css.dest).replace('scss', 'css'));
      }
      return stylesFunc();
  });

  gulp.watch(paths.html.src)
    .on('all', (event, path) => {
      if (event === 'unlink' || event === 'unlinkDir') {
        return del(path.replace(/src\/views/, paths.html.dest).replace('ejs', 'html'));
      }
      return htmlFunc();
    });
  gulp.watch(paths.html.tempSrc, gulp.series(htmlFunc));

  gulp.watch(paths.scripts.src)
    .on('all', (event, path) => {
      if (event === 'unlink' || event === 'unlinkDir') {
        return del(path.replace(/src\/js/, paths.scripts.dest));
      }
      return scriptFunc();
  });
  gulp.watch(paths.styles.tempSrc, gulp.series(stylesFunc));

  gulp.watch(paths.images.src)
    .on('all', (event, path) => {
      if (event === 'unlink' || event === 'unlinkDir') {
        return del(path.replace(/src\/assets/, paths.images.dest));
      }
      return imageFunc();
  });
  gulp.watch(srcpathAll, gulp.series(browserReload));
}


// mapfile削除
function clearMap() {
  return del([paths.styles.clearmap]);
}


// タスクの実行
exports.default = gulp.series(gulp.parallel(stylesFunc, htmlFunc, scriptFunc, imageFunc), gulp.series(destServer, watchFiles));
exports.clearmap = clearMap;
