if __name__ == '__main__':
    import sys
    # When searching import keyword, it will search sys.path from first to last for module name.
    print("system paths: ", sys.path)
    # It will first search system module cacge, then search sys.path.
    print(sys.modules)
    # print(TiktokBot)  # <class 'tiktok_uploader.TiktokBot.TiktokBot'>
    # import importlib
    # print(importlib.import_module("TaskManager", "tiktok_uploader"))
    import tiktok_uploader
    print(tiktok_uploader.__path__)  # Packages are special modules that contain __path__.

    # List of finder objects for import are:
    print("Finders:", sys.meta_path)

    print("Import Path Hooks:", sys.path_hooks)

    # 1st on import, it will search sys.modules to see if module is already loaded.
    # 2nd it will search sys.meta_path to see if a finder object can find queried module.
    # Each finder object must implement find_spec(name, import_path, target_module=None) method.
    # These meta path hooks can use any strategy to find the module.
    # If it can the finder can handle the named module it returns a spec object else None.
    # If the sys.meta_path reaches the end of the list with None returned, the import will fail.
    # Raising ModuleNotFoundError.
    # find_spec first argument is fully qualified name of the module "foo.bar.biz", with the import_path as
    # parent package __path__.
    # For an import of foo.bar.biz, three calls will be made by the meta path finder.
    # mpf.find_spec("foo", None, None)
    # mpf.find_spec("foo.bar", foo.__path__, None
    # mpf.find_spec("foo.bar.baz", foo.bar.__path__, None)

    # show python import loaders
    print("Import Loaders:", sys.path_importer_cache)


from tiktok_uploader.TaskManager import TaskManager


class TiktokBot:
    def __init__(self):
        self.task_manager = TaskManager(self)

    def uploadVideo(self, video_path, videoText=None):
        if video_path:
            self.task_manager.uploadVideo(video_path, videoText)
        else:
            print("Video path is empty")

