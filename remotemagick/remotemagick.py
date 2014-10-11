#! /usr/bin/env python
import SimpleXMLRPCServer
import base64, md5, os, random, re, socket, string, subprocess, sys, time

def uuid( *args ):
	"""
	Generates a universally unique ID.
	Any arguments only create more randomness.
	http://code.activestate.com/recipes/213761/
	"""
	t = long( time.time() * 1000 )
	r = long( random.random()*100000000000000000L )
	try:
		a = socket.gethostbyname( socket.gethostname() )
	except:
		# if we can't get a network address, just imagine one
		a = random.random()*100000000000000000L
	data = str(t)+' '+str(r)+' '+str(a)+' '+str(args)
	data = md5.md5(data).hexdigest()
	return data

accessList=('127.0.0.1') #add additional IPs to this array to allow external calls

class Server(SimpleXMLRPCServer.SimpleXMLRPCServer):
	"""
    Subclass of the SimpleXMLRPCServer that restricts
	acces to a whitelist of IPs 
  	"""
	def __init__(self,*args):
		SimpleXMLRPCServer.SimpleXMLRPCServer.__init__(self,(args[0],args[1]))

	def server_bind(self):
		self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
		SimpleXMLRPCServer.SimpleXMLRPCServer.server_bind(self)

	def verify_request(self,request, client_address):
		if client_address[0] in accessList:
			return 1
		else:
			return 0

class xmlrpc_registers:
	"""
    defines the callable XML-RPC methods 
  	"""
	url_regex = re.compile("((mailto\:|(news|(ht|f)tp(s?))\://){1}\S+)")
	
	def __init__(self):
		self.python_string = string
	
	def resize(self,image,width,height):
		workfile_created = False
		if xmlrpc_registers.url_regex.match(image):
			decoded_workfile_name = image #the URL to an image can be passed as an input file to (Image|Graphic)Magick
			print "Work file will be read from URL " + decoded_workfile_name		
		else:
			#decode the base64 input parameter and write it to a randomly named temp file
			decoded_workfile_name = "/tmp/remoteMagick" + uuid()
			workfile_created = True
			f=open(decoded_workfile_name, 'w')
			f.write(base64.b64decode(image))
			f.close()
			print "Created decoded work file " + decoded_workfile_name
		
		
		# call the 'convert' ImageMagick utility to resize the input image and write the 
		# result to another randomly named temp file
		resized_workfile_name = "/tmp/remoteMagick" + uuid()
		thumb_size = str(width) + "x" + str(height) + ">"
		subprocess.check_call(["convert","-adaptive-resize",thumb_size,
      "-type", "Grayscale", "-colorspace", "Gray", 
      "-black-threshold", "30%", "-white-threshold", "70%", "-ordered-dither", "2x1",
      "-colors", "2", "-depth", "1",
      "-define", "png:compression-level=9", "-define", "png:compression-strategy=0",
      "-define", "png:exclude-chunk=all",
      decoded_workfile_name, "PNG8:" + resized_workfile_name])
		print "Created resized work file " +  resized_workfile_name
		
		#encode the result of the ImageMagick conversion to base64
		f=open(resized_workfile_name, 'r')
		encoded_file = base64.b64encode(f.read())
		f.close()
		
		#clean up randomly named temp files
		if workfile_created:
			os.remove(decoded_workfile_name)
			print "Deleted decoded work file " + decoded_workfile_name
		
		os.remove(resized_workfile_name)
		print "Deleted resized work file " +  resized_workfile_name
		
		return encoded_file

	def crop_and_resize(self,image,startx,starty,crop_width,crop_height,resize_width,resize_height):
		workfile_created = False
		if xmlrpc_registers.url_regex.match(image):
			decoded_workfile_name = image #the URL to an image can be passed as an input file to (Image|Graphic)Magick
			print "Work file will be read from URL " + decoded_workfile_name		
		else:
			#decode the base64 input parameter and write it to a randomly named temp file
			decoded_workfile_name = "/tmp/remoteMagick" + uuid()
			workfile_created = True
			f=open(decoded_workfile_name, 'w')
			f.write(base64.b64decode(image))
			f.close()
			print "Created decoded work file " + decoded_workfile_name
		
		
		# call the 'convert' ImageMagick utility to resize the input image and write the 
		# result to another randomly named temp file
		resized_workfile_name = "/tmp/remoteMagick" + uuid()
		new_size = str(resize_width) + "x" + str(resize_height) + ">"
		crop = str(startx) + "x" + str(starty) + "+" + str(crop_width) + "+" + str(crop_height) + "!"
		subprocess.check_call(["convert",
      "-crop", crop,
      "-adaptive-resize",new_size,
      "-type", "Grayscale", "-colorspace", "Gray", 
      "-black-threshold", "70%", "-white-threshold", "70%",# "-ordered-dither", "2x1",
      "-colors", "2", "-depth", "1",
      "-define", "png:compression-level=9", "-define", "png:compression-strategy=0",
      "-define", "png:exclude-chunk=all",
      decoded_workfile_name, "PNG8:" + resized_workfile_name])
		print "Created resized work file " +  resized_workfile_name
		
		#encode the result of the ImageMagick conversion to base64
		f=open(resized_workfile_name, 'r')
		encoded_file = base64.b64encode(f.read())
		f.close()
		
		#clean up randomly named temp files
		if workfile_created:
			os.remove(decoded_workfile_name)
			print "Deleted decoded work file " + decoded_workfile_name
		
		os.remove(resized_workfile_name)
		print "Deleted resized work file " +  resized_workfile_name
		
		return encoded_file

if __name__ == "__main__":
	port = 8042 #8042 is the default port
	if len(sys.argv) > 1: 
		port = sys.argv[1]
	server = Server('',int(port))
	server.register_instance(xmlrpc_registers())
	print "Started RemoteMagick on port " + str(port)
	server.serve_forever()
