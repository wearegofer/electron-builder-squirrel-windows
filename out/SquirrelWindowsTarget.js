"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _builderUtil() {
  const data = require("builder-util");

  _builderUtil = function () {
    return data;
  };

  return data;
}

function _binDownload() {
  const data = require("app-builder-lib/out/binDownload");

  _binDownload = function () {
    return data;
  };

  return data;
}

function _appBuilderLib() {
  const data = require("app-builder-lib");

  _appBuilderLib = function () {
    return data;
  };

  return data;
}

var path = _interopRequireWildcard(require("path"));

function _sanitizeFilename() {
  const data = _interopRequireDefault(require("sanitize-filename"));

  _sanitizeFilename = function () {
    return data;
  };

  return data;
}

function _squirrelPack() {
  const data = require("./squirrelPack");

  _squirrelPack = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

class SquirrelWindowsTarget extends _appBuilderLib().Target {
  constructor(packager, outDir) {
    super("squirrel");
    this.packager = packager;
    this.outDir = outDir; //tslint:disable-next-line:no-object-literal-type-assertion

    this.options = Object.assign({}, this.packager.platformSpecificBuildOptions, this.packager.config.squirrelWindows);
  }

  async build(appOutDir, arch) {
    const packager = this.packager;
    const version = packager.appInfo.version;
    const sanitizedName = (0, _sanitizeFilename().default)(this.appName); // tslint:disable-next-line:no-invalid-template-strings

    const setupFile = packager.expandArtifactNamePattern(this.options, "exe", arch, "${productName} Setup ${version}.${ext}");
    const packageFile = `${sanitizedName}-${(0, _squirrelPack().convertVersion)(version)}-full.nupkg`;
    const installerOutDir = path.join(this.outDir, `squirrel-windows${(0, _appBuilderLib().getArchSuffix)(arch)}`);
    const artifactPath = path.join(installerOutDir, setupFile);
    await packager.info.callArtifactBuildStarted({
      targetPresentableName: "Squirrel.Windows",
      file: artifactPath,
      arch
    });

    if (arch === _appBuilderLib().Arch.ia32) {
      _builderUtil().log.warn("For windows consider only distributing 64-bit or use nsis target, see https://github.com/electron-userland/electron-builder/issues/359#issuecomment-214851130");
    }

    const distOptions = await this.computeEffectiveDistOptions();
    const squirrelBuilder = new (_squirrelPack().SquirrelBuilder)(distOptions, installerOutDir, packager);
    await squirrelBuilder.buildInstaller({
      setupFile,
      packageFile
    }, appOutDir, this.outDir, arch);
    await packager.info.callArtifactBuildCompleted({
      file: artifactPath,
      target: this,
      arch,
      safeArtifactName: `${sanitizedName}-Setup-${version}${(0, _appBuilderLib().getArchSuffix)(arch)}.exe`,
      packager: this.packager
    });
    const packagePrefix = `${this.appName}-${(0, _squirrelPack().convertVersion)(version)}-`;
    packager.info.dispatchArtifactCreated({
      file: path.join(installerOutDir, `${packagePrefix}full.nupkg`),
      target: this,
      arch,
      packager
    });

    if (distOptions.remoteReleases != null) {
      packager.info.dispatchArtifactCreated({
        file: path.join(installerOutDir, `${packagePrefix}delta.nupkg`),
        target: this,
        arch,
        packager
      });
    }

    packager.info.dispatchArtifactCreated({
      file: path.join(installerOutDir, "RELEASES"),
      target: this,
      arch,
      packager
    });
  }

  get appName() {
    return this.options.name || this.packager.appInfo.name;
  }

  async computeEffectiveDistOptions() {
    const packager = this.packager;
    let iconUrl = this.options.iconUrl;

    if (iconUrl == null) {
      const info = await packager.info.repositoryInfo;

      if (info != null) {
        iconUrl = `https://github.com/${info.user}/${info.project}/blob/master/${packager.info.relativeBuildResourcesDirname}/icon.ico?raw=true`;
      }

      if (iconUrl == null) {
        throw new (_builderUtil().InvalidConfigurationError)("squirrelWindows.iconUrl is not specified, please see https://www.electron.build/configuration/squirrel-windows#SquirrelWindowsOptions-iconUrl");
      }
    }

    checkConflictingOptions(this.options);
    const appInfo = packager.appInfo;
    const projectUrl = await appInfo.computePackageUrl();
    const appName = this.appName;
    const options = Object.assign({
      name: appName,
      productName: this.options.name || appInfo.productName,
      appId: this.options.useAppIdAsId ? appInfo.id : appName,
      version: appInfo.version,
      description: appInfo.description,
      // better to explicitly set to empty string, to avoid any nugget errors
      authors: appInfo.companyName || "",
      iconUrl,
      extraMetadataSpecs: projectUrl == null ? null : `\n    <projectUrl>${projectUrl}</projectUrl>`,
      copyright: appInfo.copyright,
      packageCompressionLevel: parseInt(process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL || packager.compression === "store" ? 0 : 9, 10),
      vendorPath: await (0, _binDownload().getBinFromUrl)("Squirrel.Windows", "1.9.0", "qs9DTfoekVNUZuRH4aH/oLlIfckUHAAj1BTkJY4DWsE2V3WpTBtezpl66c/fyrnD8iHfsDkFMgSoNirmv0qusQ==")
    }, this.options);

    if (options.remoteToken == null) {
      options.remoteToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    }

    if (!("loadingGif" in options)) {
      const resourceList = await packager.resourceList;

      if (resourceList.includes("install-spinner.gif")) {
        options.loadingGif = path.join(packager.buildResourcesDir, "install-spinner.gif");
      }
    }

    if (this.options.remoteReleases === true) {
      const info = await packager.info.repositoryInfo;

      if (info == null) {
        _builderUtil().log.warn("remoteReleases set to true, but cannot get repository info");
      } else {
        options.remoteReleases = `https://github.com/${info.user}/${info.project}`;

        _builderUtil().log.info({
          remoteReleases: options.remoteReleases
        }, `remoteReleases is set`);
      }
    }

    return options;
  }

}

exports.default = SquirrelWindowsTarget;

function checkConflictingOptions(options) {
  for (const name of ["outputDirectory", "appDirectory", "exe", "fixUpPaths", "usePackageJson", "extraFileSpecs", "extraMetadataSpecs", "skipUpdateIcon", "setupExe"]) {
    if (name in options) {
      throw new (_builderUtil().InvalidConfigurationError)(`Option ${name} is ignored, do not specify it.`);
    }
  }

  if ("noMsi" in options) {
    _builderUtil().log.warn(`noMsi is deprecated, please specify as "msi": true if you want to create an MSI installer`);

    options.msi = !options.noMsi;
  }

  const msi = options.msi;

  if (msi != null && typeof msi !== "boolean") {
    throw new (_builderUtil().InvalidConfigurationError)(`msi expected to be boolean value, but string '"${msi}"' was specified`);
  }
} 
// __ts-babel@6.0.4
//# sourceMappingURL=SquirrelWindowsTarget.js.map