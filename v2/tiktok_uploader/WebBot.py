from .Browser import Browser
import sys

class WebBot:
    # Key Web Elements needed:

    # [] Video Upload Input Element
    # [] Caption Input Element
    # [] Private/Public Toggle Element
    # [] Upload Button Element


    def __init__(self):
        self.browser = Browser.getBrowser().getWebDriver()

    def getVideoUploadInput(self):
        self.browser.WebDriverWait(self.browser, 10).until(self.browser.EC.presence_of_element_located((self.browser.By.TAG_NAME, "iframe")))
        self.browser.switch_to.frame(0)
        self.browser.implicitly_wait(1)
        file_input_element = self.browser.find_elements(self.browser.By.CLASS_NAME, "upload-btn-input")[0]
        return file_input_element

    def getCaptionElem(self):
        self.browser.implicitly_wait(3)
        try:
            self.browser.execute_script(
                f'var element = document.getElementsByClassName("public-DraftStyleDefault-block")[0].children['
                f'0].getAttribute("data-offset-key");')
            caption_elem = self.browser.find_elements(self.browser.By.CLASS_NAME, "public-DraftStyleDefault-block")[0]
            return caption_elem
        except Exception as e:
            print(f"Couldn't find hashtag input element. Please update code in WebBot.py: getCaptionElem()")
            return None


    def selectPrivateRadio(self):
        try:
            self.browser.WebDriverWait(self.browser, 10).until(self.browser.EC.presence_of_all_elements_located((By.CLASS_NAME, "permission")))
            open_menu = \
                self.browser.find_elements(self.browser.By.CLASS_NAME, "permission")[0].find_elements(By.XPATH, './*')[
                    1].find_elements(
                    self.browser.By.XPATH, './*')[0]
            open_menu.click()
            self.browser.WebDriverWait(self.browser, 10).until(
                self.browser.EC.presence_of_all_elements_located((self.browser.By.CLASS_NAME, "tiktok-select-dropdown-item")))
            self.browser.find_elements(self.browser.By.CLASS_NAME, "tiktok-select-dropdown-item")[2].click()

        except Exception as e:
            print(f"Private Toggle Error: {e}")
            self._click_elem(
                # 'document.getElementsByClassName("radio-group")[0].children[2].click()',
                "document.getElementsByClassName('permission')[0].childNodes[1].childNodes[2].click()",
                "Javascript had trouble finding the 'private' toggle radio button with given selector,"
                " please submit yourself and edit submit button placement.!!")

    def selectPublicRadio(self):
        try:
            self.browser.WebDriverWait(self.browser, 10).until(self.browser.EC.presence_of_element_located(
                self.browser.find_elements_by_class_name("permission")[0].childNodes[1].childNodes[0]))
            open_menu = self.browser.find_elements_by_class_name("permission")[0].childNodes[1].childNodes[0].click()
            self.browser.WebDriverWait(self.browser, 10).until(self.browser.EC.presence_of_element_located(
                self.browser.find_elements_by_class_name("tiktok-select-dropdown")[0].childNodes[0]))
            public_submenu = self.browser.find_elements(self.browser.By.CLASS_NAME, "tiktok-select-dropdown")[0].childNodes[0]
            # Needs to be done in action chain to work.

        except Exception as e:
            # Final attempt to find the element.
            self._click_elem(
                # 'document.getElementsByClassName("radio-group")[0].children[0].click()',
                "document.getElementsByClassName('permission')[0].childNodes[1].childNodes[0].click()",
                "Javascript had trouble finding the 'public' toggle radio button with given selector,"
                " please submit yourself and edit submit button placement.!!")


    def selectScheduleToggle(self):
        """ not supported yet """
        pass


    def uploadButtonClick(self):
        try:
            """Newer layout."""
            self.browser.WebDriverWait(self.browser, 10).until(self.browser.EC.presence_of_all_elements_located((By.CLASS_NAME, "op-part-v2")))
            operation_elems = self.browser.find_elements(self.browser.By.CLASS_NAME, "op-part-v2")[0]
            upload_elem = operation_elems.find_elements(self.browser.By.XPATH, './*')[1]
            upload_elem.click()
        except Exception as e:
            try:
                upload_name = "Post"
                self.browser.find_element(self.browser.By.XPATH, f'//button[text()="{upload_name}"]')
            except Exception as e:
                try:
                    """Older Layout"""
                    self._click_elem(
                        'document.getElementsByClassName("btn-post")[0].click()',
                        "Javascript had trouble finding the post button with given selector,"
                        " please submit yourself and edit submit button placement.!!")
                except Exception as e:
                    print("Could not upload, please upload manually.")


    def _click_elem(self, javascript_script, error_msg):

        try:
            self.browser.execute_script(javascript_script)
        except self.browser.exceptions.JavascriptException as je:
            print(error_msg)
            print(je)
        except Exception as e:
            print(f"Unhandled Error: {e}")
            sys.exit()
        return