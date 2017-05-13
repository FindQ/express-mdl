/*! Copyright 2017 FindQ and contributors. Licensed under the MIT license. */

/**
 * @file Manages assets for 'material-design-lite' in an express app
 * @module @findq/express-mdl
 * @license MIT License
 *
 * Copyright (c) 2017 FindQ <contact@findquf.com>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import * as fs from "fs"
import * as path from "path"

import * as _ from "lodash"
import * as express from "express"

/**
 * @namespace
 */
namespace ExpressMDLThemes {
	/**
	 * Describes the schema of themes.json
	 * @interface
	 * @prop {IThemePrimary} - All themes in 'material-design-lite'
	 */
	export interface ITheme {
		themes: IThemePrimary
	}

	/**
	 * Describes the schema of primary colors in themes in themes.json
	 * @interface
	 */
	export interface IThemePrimary {
		[primaryColor: string]: IThemeAccent
	}

	/**
	 * Describes the schema of accent colors in themes[<primaryColor>] in themes.json
	 * @interface
	 */
	export interface IThemeAccent {
		[accentColor: string]: boolean
	}

	/**
	 * @interface
	 * @prop {IThemes} themes - Cached themes
	 * @prop {number} lastCache - When themes were last cached (in milliseconds from the UNIX epoch)
	 */
	export interface IThemesCache {
		themes: IThemePrimary
		lastCache: number
	}

	/**
	 * @interface
	 * @prop {boolean} primary - The primary color's result of the validation
	 * @prop {boolean} accent - The accent color's result of the validation
	 */
	export interface IValidated {
		primary: boolean
		accent: boolean
	}
}

class ExpressMDL {
	/**
	 * The default theme's primary color
	 */
	public static defaultPrimaryColor: string = "indigo"
	/**
	 * The default theme's primary color
	 */
	public static defaultAccentColor: string = "pink"

	/**
	 * The dist folder for 'material-design-lite'
	 */
	public distFolder: string = path.resolve("node_modules", "material-design-lite", "dist")

	/**
	 * The router to return as result for the whole module
	 */
	private _router: express.Router

	/**
	 * Specifies how long cached themes should be cached
	 */
	protected themesCachedFor: number = 600000

	/**
	 * An object to keep a cache for themes
	 */
	protected themesCache: ExpressMDLThemes.IThemesCache = {
		themes: {},
		lastCache: 0,
	}

	/**
	 * @param {string} primaryColor - The primary color of a 'material-design-lite' theme
	 * @param {string} accentColor - The accent color of a 'material-design-lite' theme
	 * @constructor
	 */
	constructor(public primaryColor: string = ExpressMDL.defaultPrimaryColor, public accentColor: string = ExpressMDL.defaultAccentColor) {
		const validateColorsResult = this.validateColors()

		if (!validateColorsResult.primary) {
			const compiled: _.TemplateExecutor = _.template("<%= primaryColor %> is not a valid primary color for material-design-lite, will use the default primary color.")
			console.warn(compiled({
				primaryColor: primaryColor,
			}))
		}

		if (!validateColorsResult.accent) {
			const compiled: _.TemplateExecutor = _.template("<%= accentColor %> is not a valid accent color for material-design-lite, will use the default accent color.")
			console.warn(compiled({
				accentColor: accentColor,
			}))
		}

		this._router = express.Router()
	}

	/**
	 * Get themes from themes.json or cache
	 */
	public get themes(): ExpressMDLThemes.ITheme {
		const themesFile: string = path.resolve(__dirname, "themes.json")
		
		if (_.now() + this.themesCachedFor > _.get(this.themesCache, "lastCache", 0)) {
			this.themesCache.lastCache = _.now()
			
			const themesFileContent: ExpressMDLThemes.ITheme = JSON.parse(fs.readFileSync(themesFile, "utf-8")) as ExpressMDLThemes.ITheme
			this.themesCache.themes = themesFileContent.themes
		}

		return _.get(this.themesCache, "themes") as ExpressMDLThemes.ITheme
	}

	/**
	 * Get the express router
	 */
	public get router(): express.Router {
		return this._router
	}

	/**
	 * Get the primary color
	 */
	public get primary(): string {
		return this.primaryColor
	}

	/**
	 * Get the accent color
	 */
	public get accent(): string {
		return this.accentColor
	}

	/**
	 * Change the primary color
	 * @param {string} primaryColor - The primary color of a 'material-design-lite' theme
	 */
	public set primary(primaryColor: string) {
		if (this.validatePrimaryColor(primaryColor)) {
			this.primaryColor = primaryColor
		}
	}

	/**
	 * Change the accent color
	 * @param {string} accentColor - The accent color of a 'material-design-lite' theme
	 */
	public set accent(accentColor: string) {
		if (this.validateAccentColor(accentColor)) {
			this.accentColor = accentColor
		}
	}

	/**
	 * Validates the primary color against themes.json
	 */
	private validatePrimaryColor(primaryColor: string = this.primaryColor): boolean {
		return _.has(this.themes, this.primaryColor)
	}

	/**
	 * Validates the accent color against themes.json
	 */
	private validateAccentColor(primaryColor: string = this.primaryColor, accentColor: string = this.accentColor): boolean {
		const primaryColorObject: ExpressMDLThemes.ITheme = _.get(this.themes, this.primaryColor) as ExpressMDLThemes.ITheme
		
		return _.has(primaryColorObject, this.accentColor)
	}

	/**
	 * Validates the primary- and accent color against themes.json
	 */
	private validateColors(): ExpressMDLThemes.IValidated {
		const primaryColorIsValid: boolean = this.validatePrimaryColor()
		if (!primaryColorIsValid) {
			this.primaryColor = ExpressMDL.defaultPrimaryColor
		}

		const accentColorIsValid: boolean = this.validateAccentColor()
		if (!accentColorIsValid) {
			this.accentColor = ExpressMDL.defaultAccentColor
		}

		return {
			primary: primaryColorIsValid,
			accent: accentColorIsValid,
		}
	}
}

/**
 * @param {string} primaryColor - The primary color of a 'material-design-lite' theme
 * @param {string} accentColor - The accent color of a 'material-design-lite' theme
 */
export default (primaryColor: string, accentColor: string) => {
	const expressMdl: ExpressMDL = new ExpressMDL(primaryColor, accentColor)

	const router: express.Router = expressMdl.router

	/** GET /mdl/material.min.css */
	router.get("/material.min.css", (req, res) => {
		const compiled: _.TemplateExecutor = _.template("material.<%= primary %>-<%= accent %>.min.css")
		const filename: string = compiled({
			primary: expressMdl.primary,
			accent: expressMdl.accent,
		})
		
		res.sendFile(path.join(expressMdl.distFolder, filename))
	})

	/** GET /mdl/material.min.css.map */
	router.get("/material.min.css.map", (req, res) => {
		res.sendFile(path.join(expressMdl.distFolder, "material.min.css.map"))
	})

	/** GET /mdl/material.min.js */
	router.get("/material.min.js", (req, res) => {
		res.sendFile(path.join(expressMdl.distFolder, "material.min.js"))
	})

	/** GET /mdl/material.min.js.map */
	router.get("/material.min.js.map", (req, res) => {
		res.sendFile(path.join(expressMdl.distFolder, "material.min.js.map"))
	})

	return expressMdl.router
}
