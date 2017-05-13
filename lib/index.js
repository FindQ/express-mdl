"use strict";
/*! Copyright 2017 FindQ and contributors. Licensed under the MIT license. */
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const express = require("express");
class ExpressMDL {
    constructor(primaryColor = ExpressMDL.defaultPrimaryColor, accentColor = ExpressMDL.defaultAccentColor) {
        this.primaryColor = primaryColor;
        this.accentColor = accentColor;
        this.distFolder = path.resolve("node_modules", "material-design-lite", "dist");
        this.themesCachedFor = 600000;
        this.themesCache = {
            themes: {},
            lastCache: 0,
        };
        const validateColorsResult = this.validateColors();
        if (!validateColorsResult.primary) {
            const compiled = _.template("<%= primaryColor %> is not a valid primary color for material-design-lite, will use the default primary color.");
            console.warn(compiled({
                primaryColor: primaryColor,
            }));
        }
        if (!validateColorsResult.accent) {
            const compiled = _.template("<%= accentColor %> is not a valid accent color for material-design-lite, will use the default accent color.");
            console.warn(compiled({
                accentColor: accentColor,
            }));
        }
        this._router = express.Router();
    }
    get themes() {
        const themesFile = path.resolve(__dirname, "themes.json");
        if (_.now() + this.themesCachedFor > _.get(this.themesCache, "lastCache", 0)) {
            this.themesCache.lastCache = _.now();
            const themesFileContent = JSON.parse(fs.readFileSync(themesFile, "utf-8"));
            this.themesCache.themes = themesFileContent.themes;
        }
        return _.get(this.themesCache, "themes");
    }
    get router() {
        return this._router;
    }
    get primary() {
        return this.primaryColor;
    }
    get accent() {
        return this.accentColor;
    }
    set primary(primaryColor) {
        if (this.validatePrimaryColor(primaryColor)) {
            this.primaryColor = primaryColor;
        }
    }
    set accent(accentColor) {
        if (this.validateAccentColor(accentColor)) {
            this.accentColor = accentColor;
        }
    }
    validatePrimaryColor(primaryColor = this.primaryColor) {
        return _.has(this.themes, this.primaryColor);
    }
    validateAccentColor(primaryColor = this.primaryColor, accentColor = this.accentColor) {
        const primaryColorObject = _.get(this.themes, this.primaryColor);
        return _.has(primaryColorObject, this.accentColor);
    }
    validateColors() {
        const primaryColorIsValid = this.validatePrimaryColor();
        if (!primaryColorIsValid) {
            this.primaryColor = ExpressMDL.defaultPrimaryColor;
        }
        const accentColorIsValid = this.validateAccentColor();
        if (!accentColorIsValid) {
            this.accentColor = ExpressMDL.defaultAccentColor;
        }
        return {
            primary: primaryColorIsValid,
            accent: accentColorIsValid,
        };
    }
}
ExpressMDL.defaultPrimaryColor = "indigo";
ExpressMDL.defaultAccentColor = "pink";
exports.default = (primaryColor, accentColor) => {
    const expressMdl = new ExpressMDL(primaryColor, accentColor);
    const router = expressMdl.router;
    router.get("/material.min.css", (req, res) => {
        const compiled = _.template("material.<%= primary %>-<%= accent %>.min.css");
        const filename = compiled({
            primary: expressMdl.primary,
            accent: expressMdl.accent,
        });
        res.sendFile(path.join(expressMdl.distFolder, filename));
    });
    router.get("/material.min.css.map", (req, res) => {
        res.sendFile(path.join(expressMdl.distFolder, "material.min.css.map"));
    });
    router.get("/material.min.js", (req, res) => {
        res.sendFile(path.join(expressMdl.distFolder, "material.min.js"));
    });
    router.get("/material.min.js.map", (req, res) => {
        res.sendFile(path.join(expressMdl.distFolder, "material.min.js.map"));
    });
    return expressMdl.router;
};
