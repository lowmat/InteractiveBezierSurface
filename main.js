var gl;
var t = 0;


var texture;
var texture2;

var sharedUniforms;


var phongProgram;
var primitiveProgram;

var lightModel;

var lightPosition;
var bezierSurf;
var coordSys;

var mouseRay;
var camera;

var mouseRay;

function Camera(eye, dir, up, vFov, aspect, near, far){

	var V = lookAt(eye, add(eye,dir), up);
	var VInv = inverse(V);
	var P = perspective(vFov, aspect, near, far);
	var self = {};

	self.eye = eye;
	self.dir = dir;
	self.up = up;
	self.vFov = vFov;
	self.aspect = aspect;

	function changeView(newEye, newDir, newUp){
		self.eye = newEye || self.eye;
		self.dir = newDir || self.dir;
		self.up = newUp || self.up;

		V = lookAt(self.eye, add(self.eye,self.dir), self.up);
		VInv = inverse(V);
	}

	self.zoom = function(f){
		changeView(add(self.eye, scale(f,self.dir)), self.dir, self.up);
	}

	self.getViewMatrix = function(){
		return V;
	}

	self.getPerspectiveMatrix = function(){
		return P;
	}

// function rayVectorFromNDC(pos, fovy, aspect){
//     var z = -1.0 / Math.tan( radians(fovy) / 2 );
// 	var x = pos[0]*aspect;
// 	var y = pos[1];
// 	return vec3(x,y,z);
// }

	self.getRayFromNDCPos = function(p_ndc){
		var rdir_cs = rayVectorFromNDC(p_ndc, self.vFov, self.aspect);
		var rdir_ws = vec3(mult(VInv, vec4(rdir_cs,0)));

		console.log(rdir_ws);

		return Ray(self.eye, rdir_ws);
	}

	self.getInvViewMatrix = function(){
		return VInv;
	}


	self.rotateAroundWSOrigin = function(angle, axis_cs){
		var axis_ws = mult(VInv, vec4(axis_cs,0));	

		var R = rotate((180/Math.PI)*angle, axis_ws);
		newEye = vec3(mult(R, vec4(self.eye, 1)));
		newDir = vec3(mult(R, vec4(self.dir,0)));
		newUp = vec3(mult(R, vec4(self.up,0)));

		changeView(newEye, newDir, newUp);
	}

	// function pan(imagePlaneDelta){
	// 	console.log(imagePlaneDelta);
	// 	var delta_cs = vec4(imagePlaneDelta.x, imagePlaneDelta.y, 0.0,0.0);
	// 	var delta_ws = mult(VInv, delta_cs);
    //
	// 	var deltaV3 = vec3(delta_ws[0], delta_ws[1], delta_ws[2]);
	// 	changeView(add(eye, scale(10,deltaV3)), dir, up);
	// }

	return self;
}

var draggablePoints;

window.onload = function init()
{
	var fovy = 60;
	var canvas = document.getElementById( "gl-canvas" );

	gl = WebGLUtils.setupWebGL( canvas );
	if ( !gl ) { alert( "WebGL isn't available" ); }

	gl.viewport( 0, 0, canvas.width, canvas.height );

	gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
	gl.enable(gl.DEPTH_TEST);

	lightPosition = ObservablePoint(vec3(0,60,0));
	camera = Camera(vec3(100,100,100), vec3(-1,-1,-1), vec3(0,1,0), fovy,  canvas.width/canvas.height, 1,1000); 

	draggablePoints = DraggablePoints([ObservablePoint(vec3(100,100,100)), ObservablePoint(vec3(100,100,-100)), lightPosition]);

	// phongProgram = ShaderProgram(gl, "phong-vshader", "phong-fshader", {
	// 	normal: {name: "aNormal_ms"},
	// 	vertex: {name: "aVertexPosition_ms"},
	// 	texcoord: {name: "aTexcoord"}
	// }, 
	// {
	// 	lightPosition_ws : {name: "uLightPosition_ws", setter: gl.uniform3fv},
	// 	N: {name: "N", setter: setMat3fv(gl)}
	// }
	// );

	sharedUniforms = {
		P: {name: "P", setter: setMat4fv(gl)},
		M: {name: "M", setter: setMat4fv(gl)},
		V: {name: "V", setter: setMat4fv(gl)}
	};

	primitiveProgram = ShaderProgram(gl, "primitive-vshader", "primitive-fshader", {
		vertex: {name: "aVertexPosition_ms"},
		color: {name: "aColor"}
	},
	{});

	// useProgram(gl, phongProgram);
    //
	// bindUniformsToProgram(sharedUniforms, phongProgram.id, gl);

	lightModel = Tetrahedron(gl);

	var q = [
				[vec3(0,0,0), vec3(10,0,0), vec3(20,0,0), vec3(30,0,0)],
				[vec3(0,0,10), vec3(10,0,10), vec3(20,0,10), vec3(30,-50,10)],
				[vec3(0,0,20), vec3(10,0,20), vec3(20,0,20), vec3(30,50,20)],
				[vec3(0,0,30), vec3(10,0,30), vec3(20,0,30), vec3(30,0,30)]
			];

	bezierSurf = parametricSurface(function(u,v){ return bezierSurface(u,v,q);}, 0, 0, 30,30);
	coordSys = CoordSys(gl);
	
	texture = loadTexture(gl,"metal2.jpg");
	texture2 = loadTexture(gl,"wood2.jpg");

	setUpEventHandling(canvas, fovy);
	render();
};



function setUniformData(uniforms, data){
	Object.keys(data).forEach(function(k){
		uniforms[k].set(data[k]);
	});
}


function render() {
	gl.clear(gl.COLOR_BUFFER_BIT  | gl.DEPTH_BUFFER_BIT);
	t+=0.009;

	var M;

	var sharedUniformData = {P: flatten(camera.getPerspectiveMatrix()),
							 V: flatten(camera.getViewMatrix())};

	// useProgram(gl, phongProgram, sharedUniforms, sharedUniformData);
	// phongProgram.uniforms.lightPosition_ws.set(flatten(lightPosition));


	// ////////////////////////////////////////////////////
	// gl.bindTexture(gl.TEXTURE_2D, texture2);
	// setProgramAttributes(gl, cone, phongProgram); 
    //
	// M = mult(translate(60, 0, 0), scalem(20,50,20));
	// sharedUniforms.M.set(flatten(M));
	// phongProgram.uniforms.N.set(flatten(getNormalTransformMat3(V,M)));
	// drawObject(gl, cone);
    //
	// M = mult(translate(-60, 0, 0), scalem(20,50,20));
	// sharedUniforms.M.set(flatten(M));
	// phongProgram.uniforms.N.set(flatten(getNormalTransformMat3(V,M)));
	// drawObject(gl, cone);
    //
	// ///////////////////////////////////////////
	// gl.bindTexture(gl.TEXTURE_2D, texture);
	// setProgramAttributes(gl, surface, phongProgram); 
	// M = mult(translate(0, 0, 20), scalem(1,1,1));
	// sharedUniforms.M.set(flatten(M));
	// phongProgram.uniforms.N.set(flatten(getNormalTransformMat3(V,M)));
	// drawObject(gl, surface);
	// ////////////////////
    //
	// setProgramAttributes(gl, surface2, phongProgram); 
	// M = mult(translate(0, 0, -50), scalem(1,1,1));
	// sharedUniforms.M.set(flatten(M));
	// phongProgram.uniforms.N.set(flatten(getNormalTransformMat3(V,M)));
	// drawObject(gl, surface);
	// ///////////////////

	unloadProgram(primitiveProgram, gl);

	useProgram(gl, primitiveProgram, sharedUniforms, sharedUniformData);

	setProgramAttributes(gl, lightModel, primitiveProgram); 

	gl.lineWidth(1);

	draggablePoints.points.forEach(function(dp){
		M = mult(translate(dp.position[0], dp.position[1], dp.position[2]), scalem(5,5,5));
		sharedUniforms.M.set(flatten(M));
		drawObject(gl, lightModel);
	});

	


	sharedUniforms.M.set(flatten(scalem(1,1,1)));
	setProgramAttributes(gl, bezierSurf, primitiveProgram);
	drawObject(gl, bezierSurf);

	sharedUniforms.M.set(flatten(scalem(10,10,10)));
	setProgramAttributes(gl, coordSys, primitiveProgram);
	gl.lineWidth(2);
	drawObject(gl, coordSys);

	if(draggablePoints.closestPoint){
		var dp = draggablePoints.closestPoint;
		M = mult(translate(dp.position[0], dp.position[1], dp.position[2]), scalem(5,5,5));
		sharedUniforms.M.set(flatten(M));

		gl.lineWidth(4);
		drawObject(gl, coordSys);
	}

	if(mouseRay){
		var endP = add(mouseRay.o, scale(20, mouseRay.d));

		var line = lineModel(gl, endP, add(mouseRay.o, scale(100, mouseRay.d)));

		setProgramAttributes(gl, line, primitiveProgram);
		sharedUniforms.M.set(flatten(scalem(1,1,1)));
		drawObject(gl, line);
	}

	requestAnimFrame( render );
}
