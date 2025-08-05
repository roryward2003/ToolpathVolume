import React, { useEffect, useState } from 'react'
import { parse as parseSvg } from 'svgson'
import parsePath from 'svg-path-parser'
import "../styles/SvgHandler.css"

const SvgHandler = ({svg, updateArea, setLoading}) => {
	const CURVE_SAMPLES = 20
	const [elements, setElements] = useState([])

    // Process the svg file whenever it is updated
	useEffect(() => {
		if (svg) {
			(async () => {
				setLoading(true)
				await new Promise(requestAnimationFrame)
				await handleSvgFile(svg)
				setLoading(false)
			})()
		}
	}, [svg])

    // Completely process an svg file for calculations and rendering
	const handleSvgFile = async (file) => {
		const text = await file.text()
		const json = await parseSvg(text)
		const children = await extractChildren(json)

        // Calculate area of components
		for (let i = 0; i < children.length; i++) {
			children[i].attributes['data-nesting'] = 0
			if (children[i].name === "path") {
				children[i].attributes['data-area'] = calculatePathArea(children[i].attributes.d)
			} else {
				children[i].attributes['data-area'] = unknown
			}
		}

        // Calculate nesting level of components
		for (let i = 0; i < children.length; i++) {
			for (let j = 0; j < children.length; j++) {
				if (i != j && await nestedInside(children[i].attributes.d, children[j].attributes.d)) {
					children[j].attributes['data-nesting'] += 1
				}
			}
		}

        // Calculate algebraic sum to get total area, and adjust styling on the fly
		let totalAreaMmSquared = 0
		for (let i = 0; i < children.length; i++) {
			if (children[i].attributes['data-nesting'] % 2 == 0) {
				children[i].attributes.style = "fill:#f06020;stroke-width:0.280000;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1;stroke:#ffffff"
				totalAreaMmSquared += children[i].attributes['data-area']
			} else {
				children[i].attributes.style = "fill:#242222;stroke-width:0.280000;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1;stroke:#ffffff"
				totalAreaMmSquared -= children[i].attributes['data-area']
			}
		}

		updateArea(totalAreaMmSquared / 100)
		setElements(children)
	}

    // Flatten a nested tree of svg components
	const extractChildren = async (component) => {
		if (!component.children || component.children.length === 0) {
			return [component]
		}
		const childResults = await Promise.all(
			component.children.map(extractChildren)
		)
		return childResults.flat()
	}

    // Check if a polygon is nested inside another polygon
	const nestedInside = async (outer, inner) => {
		const outerPoly = await pathToPolygon(outer)
		const innerPoly = await pathToPolygon(inner)
		if (innerPoly.length > 3) {
			return pointInPolygon(innerPoly[0], outerPoly)
				&& pointInPolygon(innerPoly[1], outerPoly)
		} else {
			return pointInPolygon(innerPoly[0], outerPoly)
		}
	}

    // Check if a point is encapsulated inside a polygon
	const pointInPolygon = async (point, polygon) => {
		let [x, y] = point
		let inside = false
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			let xi = polygon[i][0], yi = polygon[i][1]
			let xj = polygon[j][0], yj = polygon[j][1]
			let intersect = ((yi > y) !== (yj > y)) &&
			                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
			if (intersect) inside = !inside
		}
		return inside
	}

    // Convert an svg path to a polygon
	const pathToPolygon = async (d) => {
		const commands = parsePath(d)
		const points = []
		let currentX = 0
		let currentY = 0
		let startX = 0
		let startY = 0

		for (const cmd of commands) {
			switch (cmd.code) {
				case 'M':
					currentX = cmd.x
					currentY = cmd.y
					startX = cmd.x
					startY = cmd.y
					points.push([currentX, currentY])
					break
				case 'L':
					currentX = cmd.x
					currentY = cmd.y
					points.push([currentX, currentY])
					break
				case 'H':
					currentX = cmd.x
					points.push([currentX, currentY])
					break
				case 'V':
					currentY = cmd.y
					points.push([currentX, currentY])
					break
				case 'Z':
					currentX = startX
					currentY = startY
					points.push([currentX, currentY])
					break
				case 'C': {
					let x0 = currentX
					let y0 = currentY
					for (let i = 1; i <= CURVE_SAMPLES; i++) {
						const t = i / CURVE_SAMPLES
						const x = cubicBezier(x0, cmd.x1, cmd.x2, cmd.x, t)
						const y = cubicBezier(y0, cmd.y1, cmd.y2, cmd.y, t)
						points.push([x, y])
					}
					currentX = cmd.x
					currentY = cmd.y
					break
				}
				case 'Q': {
					let x0 = currentX
					let y0 = currentY
					for (let i = 1; i <= CURVE_SAMPLES; i++) {
						const t = i / CURVE_SAMPLES
						const x = quadraticBezier(x0, cmd.x1, cmd.x, t)
						const y = quadraticBezier(y0, cmd.y1, cmd.y, t)
						points.push([x, y])
					}
					currentX = cmd.x
					currentY = cmd.y
					break
				}
				case 'A': {
					const arcPoints = approximateArc(
						currentX,
						currentY,
						cmd.rx,
						cmd.ry,
						cmd.xAxisRotation,
						cmd.largeArc,
						cmd.sweep,
						cmd.x,
						cmd.y,
						CURVE_SAMPLES
					)
					points.push(...arcPoints)
					currentX = cmd.x
					currentY = cmd.y
					break
				}
				default:
					console.warn(`Unhandled path code in pathToPolygon: ${cmd.code}`)
			}
		}
		return points
	}

    // Calculate the area encapsulated by a complex path
	const calculatePathArea = (d) => {
		const commands = parsePath(d)
		let points = []
		let currentX = 0
		let currentY = 0
		let startX = 0
		let startY = 0

        // Iterate through the svg path commands
		for (const cmd of commands) {
			switch (cmd.code) {
				case 'M': // Move to
					currentX = cmd.x
					currentY = cmd.y
					startX = cmd.x
					startY = cmd.y
					points.push([currentX, currentY])
					break
				case 'L': // Straight line
					currentX = cmd.x
					currentY = cmd.y
					points.push([currentX, currentY])
					break
				case 'H': // Horizontal line
					currentX = cmd.x
					points.push([currentX, currentY])
					break
				case 'V': // Vertical line
					currentY = cmd.y
					points.push([currentX, currentY])
					break
				case 'Z': // Close path
					currentX = startX
					currentY = startY
					points.push([currentX, currentY])
					break
				case 'C': { // Cubic bezier
					let x0 = currentX
					let y0 = currentY
					for (let i = 1; i <= CURVE_SAMPLES; i++) {
						const t = i / CURVE_SAMPLES
						const x = cubicBezier(x0, cmd.x1, cmd.x2, cmd.x, t)
						const y = cubicBezier(y0, cmd.y1, cmd.y2, cmd.y, t)
						points.push([x, y])
					}
					currentX = cmd.x
					currentY = cmd.y
					break
				}
				case 'Q': { // Quadratic bezier
					let x0 = currentX
					let y0 = currentY
					for (let i = 1; i <= CURVE_SAMPLES; i++) {
						const t = i / CURVE_SAMPLES
						const x = quadraticBezier(x0, cmd.x1, cmd.x, t)
						const y = quadraticBezier(y0, cmd.y1, cmd.y, t)
						points.push([x, y])
					}
					currentX = cmd.x
					currentY = cmd.y
					break
				}
				case 'A': { // Arc :(
					const arcPoints = approximateArc(
						currentX,
						currentY,
						cmd.rx,
						cmd.ry,
						cmd.xAxisRotation,
						cmd.largeArc,
						cmd.sweep,
						cmd.x,
						cmd.y,
						CURVE_SAMPLES
					)
					points.push(...arcPoints)
					currentX = cmd.x
					currentY = cmd.y
					break
				}
				default: // Anything else
					console.warn(`Unhandled path code: ${cmd.code}`)
			}
		}

        // Calculate the enclosed area
		return Math.abs(shoelace(points))
	}

    // Sample a cubic bezier at point t
	function cubicBezier(p0, p1, p2, p3, t) {
		return (
			(1 - t) ** 3 * p0 +
			3 * (1 - t) ** 2 * t * p1 +
			3 * (1 - t) * t ** 2 * p2 +
			t ** 3 * p3
		)
	}

    // Sample a quadratic bezier at point t
	function quadraticBezier(p0, p1, p2, t) {
		return (
			(1 - t) ** 2 * p0 +
			2 * (1 - t) * t * p1 +
			t ** 2 * p2
		)
	}

    // Calculate the shoelace area
	function shoelace(points) {
		let sum = 0
		const n = points.length
		for (let i = 0; i < n; i++) {
			const [xi, yi] = points[i]
			const [xj, yj] = points[(i + 1) % n]
			sum += xi * yj - xj * yi
		}
		return 0.5 * sum
	}

    // Approximate an arc as accurately as possible
	function approximateArc(x0, y0, rx, ry, angle, largeArcFlag, sweepFlag, x, y, samples) {
		const toRadians = angle * (Math.PI / 180)
		const cos = Math.cos(toRadians)
		const sin = Math.sin(toRadians)

		// Rotate to ellipse axis
		const dx2 = (x0 - x) / 2
		const dy2 = (y0 - y) / 2
		const x1p = cos * dx2 + sin * dy2
		const y1p = -sin * dx2 + cos * dy2

		// Fix radii if too small
		let rxSq = rx * rx
		let rySq = ry * ry
		const x1pSq = x1p * x1p
		const y1pSq = y1p * y1p

		let radiiCheck = x1pSq / rxSq + y1pSq / rySq
		if (radiiCheck > 1) {
			const scale = Math.sqrt(radiiCheck)
			rx *= scale
			ry *= scale
			rxSq = rx * rx
			rySq = ry * ry
		}

		// Find center in rotated space
		const sign = (largeArcFlag !== sweepFlag) ? 1 : -1
		const sq = Math.max(0, (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq))
		const coef = sign * Math.sqrt(sq)

		const cxp = coef * (rx * y1p / ry)
		const cyp = coef * (-ry * x1p / rx)

		// Rotate center back
		const cx = cos * cxp - sin * cyp + (x0 + x) / 2
		const cy = sin * cxp + cos * cyp + (y0 + y) / 2

		function angleBetween(ux, uy, vx, vy) {
			const dot = ux * vx + uy * vy
			const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy))
			let angle = Math.acos(Math.min(Math.max(dot / len, -1), 1))
			if (ux * vy - uy * vx < 0) angle = -angle
			return angle
		}

		// Start and sweep angle
		const ux = (x1p - cxp) / rx
		const uy = (y1p - cyp) / ry
		const vx = (-x1p - cxp) / rx
		const vy = (-y1p - cyp) / ry

		let theta1 = angleBetween(1, 0, ux, uy)
		let deltaTheta = angleBetween(ux, uy, vx, vy)

		// Sweep direction
		if (!sweepFlag && deltaTheta > 0) deltaTheta -= 2 * Math.PI
		else if (sweepFlag && deltaTheta < 0) deltaTheta += 2 * Math.PI

		// Sample points
		const points = []
		for (let i = 0; i <= samples; i++) {
			const t = i / samples
			const theta = theta1 + t * deltaTheta
			const cosT = Math.cos(theta)
			const sinT = Math.sin(theta)
			const xt = cos * rx * cosT - sin * ry * sinT + cx
			const yt = sin * rx * cosT + cos * ry * sinT + cy
			points.push([xt, yt])
		}

		return points
	}

    // Parse style string into json
	function parseStyleString(styleString) {
		if (!styleString) return {}
		return Object.fromEntries(
			styleString
            .split(";")
            .map(rule => rule.trim())
            .filter(rule => rule.length > 0)
            .map(rule => {
                const [key, value] = rule.split(":").map(s => s.trim())
                return [key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value]
            })
		)
	}

    // Only render the svg if it is non-empty
	if (!elements) return <div/>
	return (
		<svg className="svg" viewBox="-400 -400 400 800" preserveAspectRatio="xMidYMid meet">
			{elements
				.slice()
				.sort((a, b) => {
					const na = parseInt(a.attributes['data-nesting'] || '0', 10)
					const nb = parseInt(b.attributes['data-nesting'] || '0', 10)
					return na - nb
				})
				.map((el, i) => (
					<path
						key={i}
						d={el.attributes.d}
						style={parseStyleString(el.attributes.style)}
						data-nesting={el.attributes['data-nesting']}
					/>
				))
			}
		</svg>
	)
}

export default SvgHandler
