import time, requests, datetime, hashlib, hmac, random, zlib, json, datetime
import requests, zlib, json, time, subprocess, string, secrets, os, sys
from fake_useragent import FakeUserAgentError, UserAgent
from requests_auth_aws_sigv4 import AWSSigV4
from tiktok_uploader.cookies import load_cookies_from_file
from tiktok_uploader.Browser import Browser
from tiktok_uploader.bot_utils import *
from tiktok_uploader import Config, Video, eprint
from dotenv import load_dotenv


# Load environment variables
load_dotenv()

# Constants
_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'


def login(login_name: str):
	# Check if login name is already save in file.
	cookies = load_cookies_from_file(f"tiktok_session-{login_name}")
	session_cookie = next((c for c in cookies if c["name"] == 'sessionid'), None)
	session_from_file = session_cookie is not None

	if session_from_file:
		print("Unnecessary login: session already saved!")
		return session_cookie["value"]

	browser = Browser.get()
	response = browser.driver.get(os.getenv("TIKTOK_LOGIN_URL"))

	session_cookies = []
	while not session_cookies:
		for cookie in browser.driver.get_cookies():
			if cookie["name"] in ["sessionid", "tt-target-idc"]:
				if cookie["name"] == "sessionid":
					cookie_name = cookie
				session_cookies.append(cookie)

	# print("Session cookie found: ", session_cookie["value"])
	print("Account successfully saved.")
	browser.save_cookies(f"tiktok_session-{login_name}", session_cookies)
	browser.driver.quit()

	return cookie_name.get('value', '') if cookie_name else ''


# Local Code...
def upload_video(session_user, video, title, schedule_time=0, allow_comment=1, allow_duet=0, allow_stitch=0, visibility_type=0, brand_organic_type=0, branded_content_type=0, ai_label=0, proxy=None):
	try:
		user_agent = UserAgent().random
	except FakeUserAgentError as e:
		user_agent = _UA
		print("[-] Could not get random user agent, using default")

	cookies = load_cookies_from_file(f"tiktok_session-{session_user}")
	session_id = next((c["value"] for c in cookies if c["name"] == 'sessionid'), None)
	dc_id = next((c["value"] for c in cookies if c["name"] == 'tt-target-idc'), None)
	
	if not session_id:
		eprint("No cookie with Tiktok session id found: use login to save session id")
		sys.exit(1)
	if not dc_id:
		print("[WARNING]: Please login, tiktok datacenter id must be allocated, or may fail")
		dc_id = "useast2a"
	print("User successfully logged in.")
	print(f"Tiktok Datacenter Assigned: {dc_id}")
	
	print("Uploading video...")
	# Parameter validation,
	if schedule_time and (schedule_time > 864000 or schedule_time < 900):
		print("[-] Cannot schedule video in more than 10 days or less than 20 minutes")
		return False
	if len(title) > 2200:
		print("[-] The title has to be less than 2200 characters")
		return False
	if schedule_time != 0 and visibility_type == 1:
		print("[-] Private videos cannot be uploaded with schedule")
		return False

	# Check video length - 1 minute max, takes too long to run this.


	# Creating Session
	session = requests.Session()
	session.cookies.set("sessionid", session_id, domain=".tiktok.com")
	session.cookies.set("tt-target-idc", dc_id, domain=".tiktok.com")
	session.verify = True

	headers = {
		'User-Agent': user_agent,
		'Accept': 'application/json, text/plain, */*',
	}
	session.headers.update(headers)

	# Setting proxy if provided.
	if proxy:
		session.proxies = {
			"http": proxy,
			"https": proxy
		}

	creation_id = generate_random_string(21, True)
	project_url = f"https://www.tiktok.com/api/v1/web/project/create/?creation_id={creation_id}&type=1&aid=1988"
	r = session.post(project_url)

	if not assert_success(project_url, r):
		return False

	# get project_id
	project_id = r.json()["project"]["project_id"]
	video_id, session_key, upload_id, crcs, upload_host, store_uri, video_auth, aws_auth = upload_to_tiktok(video, session)

	url = f"https://{upload_host}/{store_uri}?uploadID={upload_id}&phase=finish&uploadmode=part"
	headers = {
		"Authorization": video_auth,
		"Content-Type": "text/plain;charset=UTF-8",
	}
	data = ",".join([f"{i + 1}:{crcs[i]}" for i in range(len(crcs))])

	if proxy:
		r = requests.post(url, headers=headers, data=data, proxies=session.proxies)
		if not assert_success(url, r):
			return False
	else:
		r = requests.post(url, headers=headers, data=data)
		if not assert_success(url, r):
			return False
	#
	# url = f"https://www.tiktok.com/top/v1?Action=CommitUploadInner&Version=2020-11-19&SpaceName=tiktok"
	# data = '{"SessionKey":"' + session_key + '","Functions":[{"name":"GetMeta"}]}'

	# ApplyUploadInner
	url = f"https://www.tiktok.com/top/v1?Action=CommitUploadInner&Version=2020-11-19&SpaceName=tiktok"
	data = '{"SessionKey":"' + session_key + '","Functions":[{"name":"GetMeta"}]}'

	r = session.post(url, auth=aws_auth, data=data)
	if not assert_success(url, r):
		return False

	# publish video
	url = "https://www.tiktok.com"
	headers = {
		"user-agent": user_agent
	}

	r = session.head(url, headers=headers)
	if not assert_success(url, r):
		return False

	headers = {
		"content-type": "application/json",
		"user-agent": user_agent
	}
	brand = ""

	if brand and brand[-1] == ",":
		brand = brand[:-1]
	markup_text, text_extra = convert_tags(title, session)



	# Added for showing history of data changes...

	# When uploading fails please check data payload is correct...

	# data = {
	# 	"upload_param": {
	# 		"video_param": {
	# 			"text": title,
	# 			"text_extra": text_extra,
	# 			"markup_text": markup_text,
	# 			"poster_delay": 0,
	# 		},
	# 		"visibility_type": visibility_type,
	# 		"allow_comment": allow_comment,
	# 		"allow_duet": allow_duet,
	# 		"allow_stitch": allow_stitch,
	# 		"sound_exemption": 0,
	# 		"geofencing_regions": [],
	# 		"creation_id": creation_id,
	# 		"is_uploaded_in_batch": False,
	# 		"is_enable_playlist": False,
	# 		"is_added_to_playlist": False,
	# 		"tcm_params": '{"commerce_toggle_info":' + brand + "}",
	# 		"aigc_info": {
	# 			"aigc_label_type": ai_label
	# 		}
	# 	},
	# 	"project_id": project_id,
	# 	"draft": "",
	# 	"single_upload_param": [],
	# 	"video_id": video_id,
	# 	"creation_id": creation_id,
	# }


	# data = {
	# 	"post_common_info": {
	# 		"creation_id": creation_id,
	# 		"enter_post_page_from": 1,
	# 		"post_type": 3
	# 	},
	# 	"feature_common_info_list": [
	# 		{
	# 			"geofencing_regions": [],
	# 			"playlist_name": "",
	# 			"playlist_id": "",
	# 			"tcm_params": "{\"commerce_toggle_info\":{}}",
	# 			"sound_exemption": 0,
	# 			"anchors": [],
	# 			"vedit_common_info": {
	# 				"draft": "",
	# 				"video_id": video_id
	# 			},
	# 			"privacy_setting_info": {
	# 				"visibility_type": 0,
	# 				"allow_duet": 1,
	# 				"allow_stitch": 1,
	# 				"allow_comment": 1
	# 			},
	# 			"schedule_time": schedule_time + int(time.time())
	# 		}
	# 	],
	# 	"single_post_req_list": [
	# 		{
	# 			"batch_index": 0,
	# 			"video_id": video_id,
	# 			"is_long_video": 0,
	# 			"single_post_feature_info": {
	# 				"text": title,
	# 				"text_extra": text_extra,
	# 				"markup_text": title,
	# 				"music_info": {},
	# 				"poster_delay": 0,
	# 			}
	# 		}
	# 	]
	# }


	data = {
		"post_common_info": {
			"creation_id": creation_id,
			"enter_post_page_from": 1,
			"post_type": 3
		},
		"feature_common_info_list": [
			{
				"geofencing_regions": [],
				"playlist_name": "",
				"playlist_id": "",
				"tcm_params": "{\"commerce_toggle_info\":{}}",
				"sound_exemption": 0,
				"anchors": [],
				"vedit_common_info": {
					"draft": "",
					"video_id": video_id
				},
				"privacy_setting_info": {
					"visibility_type": 0,
					"allow_duet": 1,
					"allow_stitch": 1,
					"allow_comment": 1
				}
			}
		],
		"single_post_req_list": [
			{
				"batch_index": 0,
				"video_id": video_id,
				"is_long_video": 0,
				"single_post_feature_info": {
					"text": title,
					"text_extra": text_extra,
					"markup_text": title,
					"music_info": {},
					"poster_delay": 0,
				}
			}
		]
	}


	# Add schedule_time to the payload if it's provided
	if schedule_time > 0:
		data["feature_common_info_list"][0]["schedule_time"] = schedule_time + int(time.time())
	
	uploaded = False
	while True:
		mstoken = session.cookies.get("msToken")
		# xbogus = subprocess_jsvmp(os.path.join(os.getcwd(), "tiktok_uploader", "./x-bogus.js"), user_agent, f"app_name=tiktok_web&channel=tiktok_web&device_platform=web&aid=1988&msToken={mstoken}")
		# /tiktok/web/project/post/v1/
		js_path = os.path.join(os.getcwd(), "tiktok_uploader", "tiktok-signature", "browser.js")
		sig_url = f"https://www.tiktok.com/api/v1/web/project/post/?app_name=tiktok_web&channel=tiktok_web&device_platform=web&aid=1988&msToken={mstoken}"
		signatures = subprocess_jsvmp(js_path, user_agent, sig_url)
		if signatures is None:
			print("[-] Failed to generate signatures")
			return False

		try:
			tt_output = json.loads(signatures)["data"]
		except (json.JSONDecodeError, KeyError) as e:
			print(f"[-] Failed to parse signature data: {str(e)}")
			return False

		project_post_dict = {
			"app_name": "tiktok_web",
			"channel": "tiktok_web",
			"device_platform": "web",
			"aid": 1988,
			"msToken": mstoken,
			"X-Bogus": tt_output["x-bogus"],
			"_signature": tt_output["signature"],
			# "X-TT-Params": tt_output["x-tt-params"],  # not needed rn.
		}

		# url = f"https://www.tiktok.com/api/v1/web/project/post/"
		url = f"https://www.tiktok.com/tiktok/web/project/post/v1/"
		r = session.request("POST", url, params=project_post_dict, data=json.dumps(data), headers=headers)
		if not assertSuccess(url, r):
			print("[-] Published failed, try later again")
			printError(url, r)
			return False

		if r.json()["status_code"] == 0:
			print(f"Published successfully {'| Scheduled for ' + str(schedule_time) if schedule_time else ''}")
			uploaded = True
			break
		else:
			print("[-] Publish failed to Tiktok, trying again...")
			printError(url, r)
			return False
		#
		# try:
		# 	if r.json()["status_msg"] == "You are posting too fast. Take a rest.":
		# 		print("[-] You are posting too fast, try later again")
		# 		return False
		# 	print(r.json())
		# 	uploaded = True
		# 	break
		# except Exception as e:
		# 	print("[-] Waiting for TikTok to process video...")
		# 	time.sleep(1.5)  # wait 1.5 seconds before asking again.
	if not uploaded:
		print("[-] Could not upload video")
		return False
	# Check if video uploaded successfully (Tiktok has changed endpoint for this)
	# url = f"https://www.tiktok.com/api/v1/web/project/list/?aid=1988"
	#
	# r = session.get(url)
	# if not assert_success(url, r):
	# 	return False
	# # print(r.json()["infos"])
	# for j in r.json()["infos"]:
	# 	try:
	# 		if j["creationID"] == creation_id:
	# 			if j["tasks"][0]["status_msg"] == "Y project task init" or j["tasks"][0]["status_msg"] == "Success":
	# 				print("[+] Video uploaded successfully.")
	# 				return True
	# 			print(f"[-] Video could not be uploaded: {j['tasks'][0]['status_msg']}")
	# 			return False
	# 	except KeyError:
	# 		print("[-] Video could not be uploaded")
	# 		print("Response ", j)


def upload_to_tiktok(video_file, session):
	url = "https://www.tiktok.com/api/v1/video/upload/auth/?aid=1988"
	r = session.get(url)
	if not assert_success(url, r):
		return False

	aws_auth = AWSSigV4(
		"vod",
		region="ap-singapore-1",
		aws_access_key_id=r.json()["video_token_v5"]["access_key_id"],
		aws_secret_access_key=r.json()["video_token_v5"]["secret_acess_key"],
		aws_session_token=r.json()["video_token_v5"]["session_token"],
	)
	with open(os.path.join(os.getcwd(), Config.get().videos_dir, video_file), "rb") as f:
		video_content = f.read()
	file_size = len(video_content)
	url = f"https://www.tiktok.com/top/v1?Action=ApplyUploadInner&Version=2020-11-19&SpaceName=tiktok&FileType=video&IsInner=1&FileSize={file_size}&s=g158iqx8434"

	r = session.get(url, auth=aws_auth)
	if not assert_success(url, r):
		return False

	# upload chunks
	upload_node = r.json()["Result"]["InnerUploadAddress"]["UploadNodes"][0]
	video_id = upload_node["Vid"]
	store_uri = upload_node["StoreInfos"][0]["StoreUri"]
	video_auth = upload_node["StoreInfos"][0]["Auth"]
	upload_host = upload_node["UploadHost"]
	session_key = upload_node["SessionKey"]
	chunk_size = 5242880
	chunks = []
	i = 0
	while i < file_size:
		chunks.append(video_content[i: i + chunk_size])
		i += chunk_size
	crcs = []
	upload_id = str(uuid.uuid4())
	for i in range(len(chunks)):
		chunk = chunks[i]
		crc = crc32(chunk)
		crcs.append(crc)
		url = f"https://{upload_host}/{store_uri}?partNumber={i + 1}&uploadID={upload_id}&phase=transfer"
		headers = {
			"Authorization": video_auth,
			"Content-Type": "application/octet-stream",
			"Content-Disposition": 'attachment; filename="undefined"',
			"Content-Crc32": crc,
		}

		r = session.post(url, headers=headers, data=chunk)

	return video_id, session_key, upload_id, crcs, upload_host, store_uri, video_auth, aws_auth




if __name__ == "__main__":
	# Testing login function
	# login("test")
	ms_token = ""
	# path = os.path.join(os.getcwd(), "./x-bogus.js")
	# print(path)
	# print(user_agent)
	base_url = "https://www.tiktok.com/api/v1/web/project/post/"
	url = f"?app_name=tiktok_web&channel=tiktok_web&device_platform=web&aid=1988&msToken={ms_token}"
	# xbogus = subprocess_jsvmp(path, user_agent, url)
	# print(xbogus)

	path = os.path.join(os.getcwd(), "tiktok-signature", "browser.js")
	proc = subprocess.Popen(['node', path , base_url+url, "agent123"], stdout=subprocess.PIPE)
	output = proc.stdout.read().decode('utf-8')
	json_output = json.loads(output)["data"]
	print(json_output)
	print(f""
	      f"X-Bogus: {json_output['x-bogus']}\n"
	      f"Signature: {json_output['signature']}\n"
	      f"Signed URL: {json_output['signed_url']}\n"
	      f"X TT Params: {json_output['x-tt-params']}\n"
		  f"User Agent: {json_output['navigator']['user_agent']}\n"
	      f"")

