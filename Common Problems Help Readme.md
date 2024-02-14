# Common Problems Help Readme

-----

## Cookies Problems:



### Using current CLI commands to store cookies,

Currently there is one way to obtain these cookies, 

`python cli.py login -n username`

This will open up a chrome window, which will prompt you to login to Tiktok, please make sure you have the latest version of Chrome installed on your system.

When logged in this cookie will be saved on your system, to view all cookies currently on system, use command:

`python cli.py show -c `

This will ensure that you can upload videos using that exact username, through command:

`python cli.py upload --user username -v "video.mp4" -t "My video title" `

### Manually add cookies using browser

Alternatively, you may want to obtain cookies manually, to do so, 

By using tiktok cookies function `save_cookies_to_file`

for the object to be saved, input the following:

```python
cookies = [{'domain': '.tiktok.com', 'expiry': EXPIRY_FROM_BROWSER, 'httpOnly': True, 'name': 'sessionid', 'path': '/', 'sameSite': 'Lax', 'secure': True, 'value': 'YOUR_SESSION_KEY_FROM_BROWSER'}]

save_cookies_to_file(cookies, "username.cookie")  # You must have the .cookie extension.
```

-----


