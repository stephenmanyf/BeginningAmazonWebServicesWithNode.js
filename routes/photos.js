var express 	= require('express');
var router 		= express.Router();
var model 		= require('./../lib/model/model-photos');
var globals		= require('./../lib/globals');
var fs = require('fs');

/* GET photo by ID */
router.get('/id/:id', function(req, res) {
	if(req.param('id')){
		var params = {
			photoID : req.param('id')
		}
		model.getPhotoByID(params, function(err, obj){
			if(err){
					res.status(400).send({error: 'Invalid photo ID'});
			} else {
				res.send(obj);
			}
		});
	} else {
		res.status(400).send({error: 'Invalid login'});		
	}
});

/* GET photo search */
router.get('/search', function(req, res) {
	res.header('Cache-Control', 'no-cache, no-store'); //Set header to make neither the browser nor CloudFront caches the response
	if (req.param('query')) {
		var params = {
			query : req.param('query')
		}
		model.getPhotosSearch(params, function(err, obj) {
			if (err) {
				res.status(400).send({error: 'Invalid photo search'});
			} else {
				res.send(obj);
			}
		});
	} else {
		res.status(400).send({error: 'No search term found'});
	}
});

/* POST create photo. */
router.post('/upload', function(req, res) {
 	if(req.param('albumID') && req.param('userID') && req.files.photo){
 		var params = {
 			userID 		: req.param('userID'),
 			albumID 	: req.param('albumID')
 		}
 		if(req.param('caption')){
 			params.caption = req.param('caption');
 		}
		fs.exists(req.files.photo.path, function(exists) {
			if (exists) {
				params.filePath =req.files.photo.path;
				var timestamp = Date.now();
				params.newFilename = params.userID + '/' + params.filePath.replace('tmp/', timestamp);
				uploadPhoto(params, function(err, fileObject) {
					if (err) {
						res.status(400).send({error: 'Invalid photo data'});
					} else {
						params.url = fileObject.url;
						delete params.filePath;
						delete params.newFilename;
						model.createPhoto(params, function(err, obj) {
							if (err) {
								res.status(400).send({error: 'Invalid photo data'});
							} else {
								res.send(obj);
							}
						});
					}
				});
			} else {
				res.status(400).send({error: 'Invalid photo data'});
			}
		});
	} else {
		res.status(400).send({error: 'Invalid photo data'});				
	}
});

/* POST delete photo. */
router.post('/delete', function(req, res) {
	if(req.param('id')){
		var params = {
			photoID : req.param('id')
		}
		model.deletePhoto(params, function(err, obj){
			if(err){
				res.status(400).send({error: 'Photo not found'});
			} else {
				res.send(obj);
			}
		});
	} else {
		res.status(400).send({error: 'Invalid photo ID'});		
	}
});

function uploadPhoto(params, callback) {
	fs.readFile(params.filePath, function (err, imgData) {
		if (err) {
			callback(erro);
		} else {
			var contentType = 'image/jpeg';
			var uploadPath = 'uploads/' + params.newFilename;
			var uploadData = {
				Bucker: globals.awsVariables().bucket,
				Key: uploadPath,
				Body: imgData,
				ACL: 'public-read',
				ContentType: contentType
			}
			putS3Object(uploadData, function(err, data) {
				if (err) {
					callback(err);
				} else {
					fs.unlink(params.filePath, function(err) {
						if (err) {
							callback(err);
						} else {
							callback(null, {url: uploadPath});
						}
					});
				}
			});
		}
	});
}

function putS3Object(uploadData, callback) {
	var aws = require('aws-sdk');
	if (globals.awsVariables().key) {
		aws.config.update({ 
			accessKeyId: globals.awsVariables().key,
			secretAccessKey: globals.awsVariables().secret
		});
	}
	var s3 = new aws.S3();
	s3.putObject(uploadData, function(err, data) {
		if (err) {
			callback(err);
		} else {
			callback(null, data);
		}
	});
}
module.exports = router;
