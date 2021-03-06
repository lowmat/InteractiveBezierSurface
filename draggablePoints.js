//accepts array of observable points
function DraggablePoints(opArr){

	var self = {};
	var dragAxes = [vec3(1,0,0), vec3(0,1,0), vec3(0,0,1)];

	//real 3D drag axis
	function getDragAxisWorldRay(){
		return Ray(self.closestPoint.position, dragAxes[self.closestPoint.state-1]);
	}

	//3D axis projected to NDC screen space (flattened with no z).
	function getDragAxisScreenRay(){
		var origin = vec2(camera.worldToNDC(self.closestPoint.position));
		var dAxis = dragAxes[self.closestPoint.state-1];
		var secondPointOnScreenAxis = vec2(camera.worldToNDC(add(self.closestPoint.position, scale(10,dAxis))));

		return Ray(origin, normalize(subtract(secondPointOnScreenAxis, origin)));
	}

	self.points = opArr;
	self.closestPoint = undefined;

	self.addObservablePoints = function(opoints){
		self.points = self.points.concat(opoints);
	}

	self.onCPStateChange = function(){}

	self.deactivate = function(){
		self.closestPoint = undefined;
	}

	self.isDragAxisSelected = function(){
		if(!self.closestPoint) return false;
		return self.closestPoint.state !== 0;
	}

	//the closest point to the mouse is determined by creating a ray from the eye
	//to the mouse position and finding the minimum distance point to the 3D ray.
	self.updateClosestPointToRay = function(ray, mousePos_ndc){

		var cp = undefined;
		var maxDist = 10;
		var minDist = Infinity;

		self.points.forEach(function(op){
			var dist = vec3ToRayDistance(op.position, ray);

			if(dist < minDist && dist < maxDist && camera.isVisible(op.position)){
				minDist = dist;
				cp = op;
			}
		});

		self.closestPoint = cp;

		if(cp)
			updateClosestPointGimbal(mousePos_ndc);

		self.onCPStateChange();
	};

	//every closest point selected is drawn at a fixed distance from the eye so that the gimbal is 
	//always the same size
	self.getNormalizedCPLocation = function(){
		var toCP = normalize(subtract(self.closestPoint.position, camera.eye));
		return add(scale(60, toCP), camera.eye);
	}


	//when the axis is selected and the user drags on the screen, the delta is first projected to the screen ray
	//of the projection of the selected axis, this ray is 2D. The end points of the projected delta are used
	//to derive the corresponding motion along the real 3D axis. This is achieved by intersecting the rays 
	//from the projected drag end points with the 3D axis of motion and applying that delta.
	self.drag = function(start_ndc, end_ndc){

		var screenRay = getDragAxisScreenRay();

		var projS = projectPointOnRay(start_ndc, screenRay);
		var projE = projectPointOnRay(end_ndc, screenRay);

		var eR = camera.getRayFromNDCPos(projE);
		var sR = camera.getRayFromNDCPos(projS);


		var worldRay = getDragAxisWorldRay();

		var wE = get3DRaysIntersectionLeastSquares(worldRay, eR);
		var wS = get3DRaysIntersectionLeastSquares(worldRay, sR);


		var delta = subtract(wE, wS);

		self.closestPoint.position = add(self.closestPoint.position, delta);
	}

	
	//when closest point is defined, its state can be 0 (no axis selected), 1 (x axis (Red) selected), 
	//2 y, and 3 z.
	function updateClosestPointGimbal(mousePos_ndc){

		function getDraggablePointState(){
			var dList = [redLS.distanceToVec(mousePos_ndc), greenLS.distanceToVec(mousePos_ndc), blueLS.distanceToVec(mousePos_ndc)];

			var maxDist = 0.05;

			closest = _.reduce(dList, function(memo, d, i){ 
				if(d < memo.dist) 
					return {dist:d, i: i+1};
				return memo;
			}, {i: 0, dist: maxDist});

			return closest.i;
		}

		var gimbalSize = 5;
		var fixCP = self.getNormalizedCPLocation();

		var red = vec2(camera.worldToNDC(add(fixCP, vec3(gimbalSize, 0,0))));
		var green = vec2(camera.worldToNDC(add(fixCP, vec3(0, gimbalSize,0))));
		var blue = vec2(camera.worldToNDC(add(fixCP, vec3(0, 0, gimbalSize))));
		var origin = vec2(camera.worldToNDC(fixCP));

		var redLS = LineSegment(red, origin);
		var greenLS = LineSegment(green, origin);
		var blueLS = LineSegment(blue, origin);

		self.closestPoint.state = getDraggablePointState();
	}
	
	return self;
}

function ObservablePoint(position, changeListener){
	var self = {};
	self.changeListener = changeListener ||  function(){};

	Object.defineProperty(self, "position", {
		get: function() { return position; },
		set: function(pos) { position = pos; self.changeListener(); }
	});

	return self;
}
