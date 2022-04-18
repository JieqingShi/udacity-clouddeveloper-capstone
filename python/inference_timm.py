import numpy as np
import torch
import yaml
from timm.data.transforms_factory import create_transform
from timm.models import create_model


# Load inference related configs
class DogBreedClassifier:
    def __init__(self, config_file):
        self.config_file = config_file
        self.config = self.load_config()
        self.model_name = self.config['model']
        self.model = self.load_model()
        self.transform = create_transform(self.config["img_size"],
                                          interpolation=self.config["interpolation"],
                                          crop_pct=self.config["crop_pct"])
        self.pred_logits = None
        self.top1 = None
        self.top5 = None
        self.probs = None
        # self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def load_config(self):
        with open(self.config_file, 'r') as stream:
            try:
                config = yaml.safe_load(stream)
            except yaml.YAMLError as exc:
                print(exc)
        return config

    def load_model(self):
        model = create_model(
            self.model_name,
            num_classes=self.config["num_classes"],
            in_chans=3,
            pretrained=self.config["pretrained"],
            checkpoint_path=self.config["chkpt_path"])
        model.eval()
        return model

    def generate_img_tensor(self, img_pillow):
        """ Generate image tensor from PIL image """
        img_tensor = self.transform(img_pillow)
        if len(img_tensor.shape) == 3:
            img_tensor = img_tensor[None]
        return img_tensor

    def predict(self, img_pillow):
        """ Predict image """
        img_tensor = self.generate_img_tensor(img_pillow)
        with torch.no_grad():
            self.pred_logits = self.model(img_tensor)
            self.top5 = np.squeeze(self.pred_logits.topk(5, dim=1)[1].cpu().numpy())
            self.top1 = np.squeeze(self.pred_logits.topk(1, dim=1)[1].cpu().numpy())
            return self.pred_logits, self.top1, self.top5

    def get_probs(self):
        """ Get probabilities """
        self.probs = torch.nn.functional.softmax(self.pred_logits, dim=1)
        return self.probs

    def get_class_name(self, class_ids):
        """ Get class name from class id """
        class_ids = class_ids.tolist()
        if type(class_ids) == int:  # top-1 prediction
            class_names = [self.config["class_dict"][class_ids]]
        else:  # top-n prediction
            class_names = [self.config["class_dict"][idx] for idx in class_ids]
        return class_names



# with open("inference_config.yaml", "r") as stream:
#     try:
#         inference_configs = yaml.safe_load(stream)
#     except yaml.YAMLError as exc:
#         print(exc)
#
# # create data transforms for image preprocessing (same as what the model has been trained on)
# tfm = create_transform(inference_configs["img_size"],
#                        interpolation=inference_configs["interpolation"],
#                        crop_pct=inference_configs["crop_pct"])
#
# # create model from checkpoint
# model = create_model(
#     inference_configs["model"],
#     num_classes=inference_configs["num_classes"],
#     in_chans=3,
#     pretrained=inference_configs["pretrained"],
#     checkpoint_path=inference_configs["checkpoint_path"])
#
# model.eval()
#
#
# def generate_img_tensor(img_pillow, transform_func=tfm):
#     """ Generate image tensor from PIL image """
#     img_tensor = transform_func(img_pillow)
#     if len(img_tensor.shape) == 3:
#         img_tensor = img_tensor[None]
#     return img_tensor
#
#
# def predict(img_tensor, model):
#     """ Predict class of image tensor """
#     with torch.no_grad():
#         pred_logits = model(img_tensor)
#         top5 = np.squeeze(pred_logits.topk(5, dim=1)[1].cpu().numpy())
#         top1 = np.squeeze(pred_logits.topk(1, dim=1)[1].cpu().numpy())
#         return pred_logits, top1, top5











